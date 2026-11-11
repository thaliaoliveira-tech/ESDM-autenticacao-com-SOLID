# Módulos, regras de negócio e integração com o app

Este documento liga cada tela e comportamento do protótipo (`prototipo/`) ao
endpoint que o implementa e lista as regras de negócio de cada módulo. O
contrato completo (parâmetros, corpos e respostas) está em
[`swagger/api.swagger.yaml`](swagger/api.swagger.yaml), servido em `/docs`.

## Visão geral

| Módulo | Pasta | Responsabilidade |
| ------ | ----- | ---------------- |
| Auth | `modules/auth` | Cadastro, login (e-mail, convidado), sessões com refresh rotativo, logout, recuperação de senha, manutenção |
| Users | `modules/users` | Perfil e "Gerenciar conta" (editar, excluir) |
| Settings | `modules/settings` | Tema, fuso horário, lembrete diário; fonte do "hoje" de cada usuário |
| Spaces | `modules/spaces` | Categorias de tarefas, contadores, "Sem espaço", atalhos |
| Tasks | `modules/tasks` | Tarefas: períodos, filtros, busca, ordenação, conclusão |
| Conversations | `modules/conversations` | Importação do WhatsApp, histórico, detalhes |
| Chat | `modules/chat` | IA (OpenRouter/DeepSeek), streaming, análise, sugestões, propostas de tarefas |
| Notifications | `modules/notifications` | Avisos no app (polling) e o lembrete diário gerado na consulta |
| Audit | `modules/audit` | Trilha de auditoria e atividade da conta |

Todos seguem as mesmas camadas (`domain` → `application` → `presentation` /
`infrastructure`); ver [architecture.md](architecture.md).

## Do protótipo para a API

| Tela / ação no protótipo | Endpoint |
| ------------------------ | -------- |
| Tela 1 · "Continue como convidado" | `POST /auth/guest` |
| Tela 2 · Entrar | `POST /auth/login` |
| Tela 2 · Esqueceu a senha? | `POST /auth/password/forgot` (devolve o link) → `POST /auth/password/reset` |
| Tela 3 · Cadastro | `POST /auth/register` |
| Recarregar a página mantém a sessão | `POST /auth/refresh` (refresh token guardado no app) |
| Gerenciar conta · atualizar e-mail | `PATCH /account` |
| Gerenciar conta · excluir conta | `DELETE /account` |
| Conta · Perfil de usuário | `GET /account` |
| Conta · Sair | `POST /auth/logout` |
| Conta · Configurações · Aparência | `GET/PATCH /settings` (`theme`) |
| Conta · Configurações · Lembrete diário | `PATCH /settings` (`dailyReminder`) + `GET /notifications` |
| Conta · Configurações · Inteligência artificial | `GET /ai/status` |
| Hoje · "O que você precisa fazer hoje?" + Para fazer/Concluídas | `GET /tasks?period=today` (`meta.counts`) ou `GET /tasks/summary` |
| Tarefas · Hoje / Amanhã / Esta semana / Todas | `GET /tasks?period=today\|tomorrow\|week\|all` |
| Filtros Pendentes / Concluídas / Todas | `status=pending\|done\|all` |
| Ordenar por criação / entrega | `sort=created\|due` (também `priority`) |
| Buscar tarefas | `q=` |
| Abrir espaço (lista filtrada) | `GET /tasks?spaceId=<id>` ou `spaceId=none` |
| + (Nova tarefa), com "+ Criar novo espaço…" | `POST /tasks` (`spaceId` ou `spaceName`) |
| Detalhes da tarefa | `GET /tasks/:id` |
| Editar / Excluir | `PATCH /tasks/:id` / `DELETE /tasks/:id` |
| Concluir / Reabrir | `POST /tasks/:id/complete` / `POST /tasks/:id/reopen` |
| Espaços · lista com pendentes/concluídas e "Sem espaço" | `GET /spaces` (`meta.unassigned`, `meta.showUnassigned`) |
| Buscar espaços | `GET /spaces?q=` |
| Novo espaço (atalhos Trabalho/Faculdade/Pessoal) | `GET /spaces/suggestions`, `POST /spaces` |
| Renomear / Excluir espaço | `PATCH /spaces/:id` / `DELETE /spaces/:id` (contagem para o aviso em `GET /spaces/:id`) |
| Conversas · Selecionar arquivo / arrastar | `POST /conversations` (multipart `file`) |
| Usar um exemplo | `POST /conversations/sample` |
| Conversas salvas · buscar, renomear, excluir | `GET /conversations?q=`, `PATCH`/`DELETE /conversations/:id` |
| Detalhes da conversa (painel ⓘ) | `GET /conversations/:id` |
| Análise automática após importar | `POST /chat/analysis` |
| Enviar pergunta (com streaming e parar) | `POST /chat/messages` (SSE; fechar a conexão interrompe) |
| Tentar novamente | `POST /chat/retry` |
| Histórico do chat | `GET /chat/messages?conversationId=` |
| Sugestões clicáveis | `GET /chat/suggestions` |
| Cartão de proposta · Confirmar / Editar / Descartar | `POST /chat/proposals/:id/confirm` (corpo = edições) / `.../discard` |
| Confirmar todas | `POST /chat/messages/:id/proposals/confirm-all` |

Estados de carregamento, vazio e erro: toda listagem devolve `data: []` e
`meta.total = 0` quando vazia; todo erro segue `ErrorResponse` com `message`
pronta para exibir e `field` para destacar o campo do formulário.

## Regras de negócio por módulo

### Auth e conta

Ver [authentication-flow.md](authentication-flow.md). Resumo:

- Nome de usuário 3–30 (`a-z0-9._`), e-mail normalizado, senha 8–128 com
  confirmação; duplicidade → `409` com `field`.
- Sessão = JWT curto com `sid` + refresh token rotativo (30 dias). Logout e
  redefinição de senha revogam sessões de verdade.
- Recuperação: link de uso único (30 min), gerar outro invalida o anterior,
  resposta idêntica para e-mails desconhecidos.
- Convidado: usuário isolado sem credenciais; não edita perfil; removido com os
  dados após 30 dias sem sessão ativa.
- Excluir a conta apaga todos os dados do usuário.

### Configurações

- `theme`: `system` (padrão), `light`, `dark`.
- `timezone` IANA (padrão `America/Sao_Paulo`): define o "hoje" do usuário em
  períodos, conclusão sem data e lembrete. Rotas com período aceitam `today`
  para usar a data do aparelho, como o protótipo fazia.
- Lembrete diário: `enabled` + `time` (HH:MM). Não há job: o app consulta
  `GET /notifications` periodicamente e cada consulta verifica se o horário já
  passou no fuso do usuário e se o lembrete de hoje ainda não foi gerado. Se
  sim, reserva o dia de forma atômica e cria a notificação "Você tem N tarefas
  pendentes para hoje." (conta só as pendentes com prazo hoje, inclusive zero).
  No máximo um por dia, mesmo com consultas simultâneas; mudar o horário
  depois do aviso não gera outro.

### Notificações

- `GET /notifications` processa o que venceu (lembrete) e devolve **só as não
  lidas**, mais recentes primeiro; `meta.total` serve de badge.
- `POST /notifications/:id/read` marca como lida e ela some da lista (`204`);
  `POST /notifications/read-all` some com todas (`204`). Notificação de outro
  usuário ou inexistente → `404`.

### Espaços

- Nome 1–40 caracteres, espaços colapsados; único por usuário sem diferenciar
  maiúsculas, acentos e espaços extras (`409`).
- Lista em ordem de criação com contagem de pendentes/concluídas.
- "Sem espaço" aparece quando há tarefas sem categoria e a busca combina com
  o rótulo.
- Excluir mantém as tarefas, sem espaço.
- Atalhos sugeridos: Trabalho, Faculdade, Pessoal (apenas os inexistentes).

### Tarefas

- Título obrigatório (até 160), descrição até 2000, responsável até 80, prazo
  `AAAA-MM-DD` válido, prioridade `high` (Urgente), `medium` (Pouco urgente),
  `low` (Não urgente) ou nenhuma. `null` limpa campos opcionais.
- Espaço por `spaceId` (precisa ser do usuário) ou `spaceName` (encontra ou
  cria); os dois juntos → `400`.
- Status `pending`/`done`; concluir grava `completedOn` (data informada ou o
  hoje do usuário); reabrir limpa.
- Períodos consideram apenas tarefas com prazo: Hoje, Amanhã, Esta semana
  (segunda a domingo); "Todas" inclui as sem prazo.
- Busca sem acentos, todos os termos, em título, descrição, responsável,
  espaço, conversa de origem e prazo.
- Ordenações: pendentes sempre primeiro; `created` (recentes), `due` (prazo
  mais próximo, sem prazo por último), `priority` (urgência, prazo; concluídas
  pela data de conclusão).
- Contadores (`meta.counts`) usam o escopo de período e espaço, sem a busca.
- `GET /tasks/summary`: contagens por período e atrasadas (pendentes com prazo
  anterior a hoje).

### Conversas

- Somente `.txt`, até 10 MB (`413`), não vazio, com linhas de data/hora do
  WhatsApp (Android `dd/mm/aaaa hh:mm - Nome: msg`, iOS `[dd/mm/aa, hh:mm:ss]
  Nome: msg`), com BOM, quebras Windows, marcas de direção e continuações.
- Datas em formato americano são reconhecidas quando o dia passa de 12.
- Reimportar o mesmo conteúdo abre a existente (`200`, `created=false`).
- Detalhes calculados sem IA: mensagens, participantes (contagem e %), dias
  com conversa, período.
- Renomear 1–160 caracteres. Excluir remove o histórico do chat e mantém as
  tarefas sem vínculo.
- Busca no nome e no texto, sem acentos (lotes de 20 conversas para limitar
  memória).

### Chat com IA

- Provedor: OpenRouter (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`); sem chave,
  `503` com instrução. A chave nunca sai do servidor.
- Contexto montado no servidor: conversa como dado (instruções dentro dela são
  ignoradas; acima de ~400 mil caracteres entra só o fim, com aviso), últimas
  20 mensagens do fio com o destino de cada proposta, até 200 tarefas,
  espaços, data e dia da semana.
- Pergunta 1–4000 caracteres, salva antes da chamada; falha → "Tentar
  novamente" (`/chat/retry`).
- Interromper (fechar a conexão) salva o trecho recebido com
  "*(resposta interrompida)*".
- Análise (`kind=analysis`): resumo, participantes, assuntos, decisões,
  tarefas, datas e pontos de atenção; sem propostas.
- Propostas pela função `propor_acoes_tarefas`: criar, editar, concluir,
  reabrir, excluir. O servidor valida datas, tamanhos, prioridade e descarta
  ações sobre tarefas inexistentes (se todas forem inválidas → `502`). Até 30
  por resposta.
- Nada é salvo antes da confirmação. Reenviar o mesmo `ref` marca a pendente
  anterior como substituída. O cartão guarda o título da tarefa.
- Confirmar aplica a ação e resolve a proposta na mesma transação; um espaço
  novo sugerido só é criado aqui; edições substituem os campos propostos.
  Proposta já resolvida → `409`.
- Sugestões: com conversa e sem perguntas, as três do protótipo; depois,
  perguntas de acompanhamento; sem conversa, comandos que remetem às funções
  do app ("Criar lista de tarefas para esta semana.", "O que tenho para fazer
  hoje?"...), ajustados às tarefas do usuário.

### Auditoria e rastreabilidade

- Toda requisição recebe `X-Request-Id` (o do cliente, se válido, ou um UUID),
  devolvido no cabeçalho, incluído nos erros e no log de acesso.
- Operações relevantes geram registros em `audit_logs` com ação, entidade,
  metadados não sensíveis, `requestId` e IP: cadastro, login, logout,
  recuperação de senha, conta, configurações, espaços, tarefas, conversas e
  propostas. `GET /account/activity` lista os do usuário.
- Registros de auditoria participam da transação da operação; uma falha ao
  auditar é logada e nunca derruba a operação.

## Integração com o app mobile (`Sintetiza/`)

O app hoje usa dados simulados (`AuthContext` com usuário fixo, listas
estáticas nas telas). Para trocar pelos dados reais:

1. **Sessão**: guardar `accessToken` e `refreshToken` (SecureStore). Em `401`
   com `SessionExpiredError` ou token expirado, chamar `POST /auth/refresh` e
   repetir; se falhar, voltar ao login.
2. **Hoje/Tarefas**: `GET /tasks?period=...&status=...&today=<data do
   aparelho>`; o + chama `POST /tasks`.
3. **Espaços**: `GET /spaces`; abrir um espaço → `GET /tasks?spaceId=...`.
4. **Conversas**: upload com `FormData` (`file`), depois `POST /chat/analysis`.
5. **Chat**: React Native não lê streaming de `fetch` nativamente; use o modo
   JSON (padrão) ou uma biblioteca de SSE com `?stream=true`.
6. **Notificações**: consultar `GET /notifications` a cada intervalo (ex.: 1
   minuto) e ao abrir/retomar o app; exibir o aviso e chamar
   `POST /notifications/:id/read` (push com o app fechado é pendência, ver README).
7. CORS: configure `CORS_ORIGINS` com a origem do Expo web, se usado.
