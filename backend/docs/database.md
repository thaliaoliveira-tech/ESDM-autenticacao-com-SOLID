# Banco de dados

## Escolha

SQLite via Prisma: zero configuração, o banco é um arquivo. Do ponto de vista
do resto do sistema a escolha é invisível — só os repositórios em
`*/infrastructure/` conhecem o Prisma. Trocar por PostgreSQL muda o `provider`
do schema e gera uma nova migration; nenhuma regra de negócio muda.

A fonte da verdade é [`prisma/schema.prisma`](../prisma/schema.prisma).

## Modelo

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : "abre"
    USERS ||--o{ PASSWORD_RESET_TOKENS : "solicita"
    USERS ||--o| USER_SETTINGS : "configura"
    USERS ||--o{ SPACES : "organiza"
    USERS ||--o{ TASKS : "possui"
    USERS ||--o{ CONVERSATIONS : "importa"
    USERS ||--o{ CHAT_MESSAGES : "conversa"
    USERS ||--o{ NOTIFICATIONS : "recebe"
    USERS ||--o{ AUDIT_LOGS : "gera"
    SPACES ||--o{ TASKS : "agrupa (SET NULL)"
    CONVERSATIONS ||--o{ TASKS : "origem (SET NULL)"
    CONVERSATIONS ||--o{ CONVERSATION_PARTICIPANTS : "tem"
    CONVERSATIONS ||--o{ CHAT_MESSAGES : "fio (CASCADE)"
    CHAT_MESSAGES ||--o{ TASK_PROPOSALS : "propõe"
    TASKS ||--o{ TASK_PROPOSALS : "alvo (SET NULL)"

    USERS {
        string id PK
        string name
        string username UK "nulo p/ convidado"
        string email UK "nulo p/ convidado"
        string passwordHash "nulo p/ convidado"
        boolean isGuest
    }
    SESSIONS {
        string id PK "claim sid do JWT"
        string userId FK
        string provider
        string refreshTokenHash UK "SHA-256"
        datetime expiresAt
        datetime revokedAt
    }
    PASSWORD_RESET_TOKENS {
        string id PK
        string userId FK
        string tokenHash UK
        datetime expiresAt
        datetime usedAt
    }
    USER_SETTINGS {
        string userId PK,FK
        string theme "system|light|dark"
        string timezone "IANA"
        boolean reminderEnabled
        string reminderTime "HH:MM"
        string reminderLastSentOn "AAAA-MM-DD"
    }
    SPACES {
        string id PK
        string userId FK
        string name
        string nameKey "UK com userId"
    }
    TASKS {
        string id PK
        string userId FK
        string spaceId FK
        string conversationId FK
        string title
        string description
        string assignee
        string dueOn "AAAA-MM-DD"
        string priority "high|medium|low"
        string status "pending|done"
        string completedOn
    }
    CONVERSATIONS {
        string id PK
        string userId FK
        string fileName
        int sizeBytes
        string content
        string fingerprint "UK com userId"
        int messageCount
        int participantCount
        int activeDays
        string firstMessageOn
        string lastMessageOn
    }
    CONVERSATION_PARTICIPANTS {
        string id PK
        string conversationId FK
        string name "UK com conversationId"
        int messageCount
    }
    CHAT_MESSAGES {
        string id PK
        string userId FK
        string conversationId FK "nulo = fio geral"
        string role "user|assistant"
        string kind "chat|analysis"
        string content
        boolean interrupted
    }
    TASK_PROPOSALS {
        string id PK
        string messageId FK
        int position "UK com messageId"
        string ref
        string type "create|update|complete|reopen|delete"
        string status "pending|confirmed|discarded|superseded"
        string taskId FK
        string taskTitle
        string payload "JSON"
        string result "JSON"
    }
    NOTIFICATIONS {
        string id PK
        string userId FK
        string type
        string title
        string body
        string data "JSON"
        datetime readAt
    }
    AUDIT_LOGS {
        string id PK
        string userId FK
        string action
        string entityType
        string entityId
        string metadata "JSON"
        string requestId
    }
```

Todas as tabelas têm `createdAt` (e `updatedAt` onde há edição).

## Decisões

| Decisão | Motivo |
| ------- | ------ |
| Todo dado tem `userId` e `ON DELETE CASCADE` | Excluir a conta remove tudo (sessões, preferências, espaços, tarefas, conversas, chat, notificações, auditoria). O isolamento entre usuários é aplicado em toda consulta (`where userId`). |
| Excluir espaço → tarefas `spaceId = NULL` | Regra do protótipo: as tarefas continuam salvas, "Sem espaço". O repositório desvincula explicitamente (atualiza `updatedAt`) e a FK garante o mesmo em qualquer caminho. |
| Excluir conversa → mensagens em cascata, tarefas `conversationId = NULL` | Regra do protótipo: o histórico some, as tarefas ficam. |
| Excluir tarefa → propostas `taskId = NULL` + `taskTitle` | O cartão da proposta continua legível no histórico depois da exclusão. |
| Exclusão física (sem *soft delete*) | O protótipo trata exclusões como definitivas ("Esta ação é definitiva") e a conta inteira pode ser apagada. A rastreabilidade fica na trilha de auditoria. |
| Datas de calendário como `TEXT` `AAAA-MM-DD` | Prazo e conclusão são datas "de parede" do usuário, sem fuso. A ordem léxica coincide com a cronológica, o que permite `BETWEEN` e índices. |
| Enums como `TEXT` validado no domínio | SQLite não tem enum; os valores aceitos estão no domínio (`task.ts`, `chat.ts`, `settings.ts`) e documentados no schema. |
| `spaces.nameKey` | Nome sem acentos, minúsculo e com espaços colapsados; `UNIQUE(userId, nameKey)` impede "Trabalho" e "trabálho " no mesmo perfil, inclusive em corrida. |
| `conversations.fingerprint` | SHA-256 do texto com quebras normalizadas; `UNIQUE(userId, fingerprint)` faz reimportar abrir a conversa existente. |
| Estatísticas da conversa materializadas | O texto é imutável depois da importação; calcular participantes e período uma vez evita reprocessar até 10 MB a cada abertura dos detalhes. |
| Tokens só como hash | `sessions.refreshTokenHash` e `password_reset_tokens.tokenHash` guardam SHA-256: um vazamento do banco não permite usar nenhum token. |
| `user_settings` 1:1 com padrões | Sem linha, a API devolve os padrões (`system`, `America/Sao_Paulo`, lembrete desligado às 09:00). |
| `reminderLastSentOn` com atualização condicional | `UPDATE ... WHERE reminderLastSentOn <> hoje` garante no máximo um lembrete por dia, mesmo com várias instâncias da API. |
| JSON em `TEXT` (`payload`, `result`, `metadata`, `data`) | Estruturas variáveis por tipo e sempre lidas inteiras; o repositório serializa e valida na fronteira. |

## Índices

| Tabela | Índice | Consulta atendida |
| ------ | ------ | ----------------- |
| `tasks` | `(userId, status)`, `(userId, dueOn)`, `(userId, spaceId)`, `(userId, createdAt)`, `(conversationId)` | listas por situação, períodos (Hoje/Amanhã/Semana), por espaço, ordenação e desvínculo |
| `spaces` | `UNIQUE(userId, nameKey)`, `(userId, createdAt)` | unicidade e listagem |
| `conversations` | `UNIQUE(userId, fingerprint)`, `(userId, createdAt)` | deduplicação e histórico |
| `chat_messages` | `(userId, conversationId, createdAt)` | fio da conversa |
| `task_proposals` | `UNIQUE(messageId, position)`, `(status, ref)`, `(taskId)` | substituição por `ref` e desvínculo |
| `sessions` | `UNIQUE(refreshTokenHash)`, `(userId)`, `(expiresAt)` | refresh, revogação em massa, limpeza |
| `password_reset_tokens` | `UNIQUE(tokenHash)`, `(userId)`, `(expiresAt)` | validação e limpeza |
| `notifications` | `(userId, readAt)`, `(userId, createdAt)` | não lidas e listagem |
| `audit_logs` | `(userId, createdAt)`, `(action)` | atividade do usuário |
| `users` | `(isGuest, createdAt)` | limpeza de convidados |

## Migrations

| Migration | Conteúdo |
| --------- | -------- |
| `20260907214723_init_user` | Tabela `users` do POC original |
| `20261111180000_sintetiza_domain` | Todas as tabelas do domínio; `users` ganha `username`, `isGuest` e `email` opcional (a tabela é redefinida **preservando os dados existentes**) |

```bash
npm run db:migrate   # desenvolvimento: aplica e gera o client
npm run db:deploy    # produção/CI: aplica as pendentes
npm run db:reset     # recria do zero (apaga os dados)
```

Os testes de integração e E2E criam `prisma/test.db` aplicando **as mesmas
migrations** (`prisma migrate deploy`), então uma migration quebrada falha a
suíte.

## Seed

`npm run db:seed` cria (ou atualiza) o usuário de desenvolvimento
`demo@example.com` / `Demo@123` (username `demo`) com o espaço "Trabalho" e uma
tarefa de boas-vindas. Variáveis `SEED_USER_*` no `.env`.

## Transações

Casos de uso que tocam mais de uma tabela rodam em uma unidade de trabalho
(`TransactionManager.run`). A implementação Prisma usa `AsyncLocalStorage`:
qualquer repositório chamado dentro de `run` obtém o client da transação por
`dbClient()`, sem receber parâmetro extra. Transações aninhadas reutilizam a
externa. Exemplos: confirmar uma proposta (cria espaço + tarefa + resolve a
proposta), redefinir a senha (troca o hash + marca o link + revoga sessões),
gerar o lembrete (reserva o dia + cria a notificação).

Os testes de integração verificam que uma falha no meio desfaz tudo.
