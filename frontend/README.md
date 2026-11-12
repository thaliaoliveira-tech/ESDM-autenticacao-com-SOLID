# Sintetiza Web

Front-end web do Sintetiza, integrado à API NestJS de `../backend`. Nasceu do
protótipo (`../prototipo`): mesmas telas, mesmo design e mesmo comportamento,
mas sem Python, sem IndexedDB/Dexie e sem lógica de negócio no navegador.
Contas, sessões, tarefas, espaços, conversas, chat com IA, preferências e
lembretes vêm todos da API.

HTML semântico, JavaScript com ES Modules e CSS próprio + Tailwind 2
pré-compilado. O Vite é a única dependência: servidor de desenvolvimento com
proxy para a API e build de produção.

## Executar

Requisitos: Node.js 20.19+ e a API rodando (veja `../backend/README.md`).

```bash
# terminal 1 — API
cd backend
npm run start:dev            # http://localhost:3000

# terminal 2 — front
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

Abra o endereço que o Vite mostrar. Se a porta 5173 estiver ocupada, ele usa
a próxima livre (5174, 5175...). O navegador fala só com o Vite: tudo em
`/api/*` é repassado para a API (`/api/tasks` → `http://localhost:3000/tasks`),
então não há CORS em desenvolvimento e o streaming do chat passa direto.

Para usar outra API, copie `.env.example` para `.env` e mude `BACKEND_URL`.

```bash
npm run build                # gera dist/ (4 páginas)
npm run preview              # serve o build, com o mesmo proxy
```

Para publicar o `dist/` em outro domínio sem proxy, defina
`VITE_API_URL=https://sua-api` antes do build e libere a origem em
`CORS_ORIGINS` no backend.

## Páginas

| Página | Função | Endpoints principais |
| --- | --- | --- |
| `index.html` | Apresentação, Entrar, Criar conta, convidado | `POST /auth/guest` |
| `tela-2.html` | Login, mostrar senha, recuperação de senha | `POST /auth/login`, `/auth/password/forgot`, `/auth/password/reset` |
| `tela-3.html` | Cadastro com validação | `POST /auth/register` |
| `inicio.html` | Hoje, Tarefas, Espaços, Conversas (chat com IA) e Conta | demais rotas |

## Como o front usa a API

- **Sessão**: `accessToken` + `refreshToken` em `localStorage`
  (`sintetiza.session`). Toda chamada leva `Authorization: Bearer`. Em `401`,
  o cliente chama `POST /auth/refresh` uma vez (refresh rotativo) e repete;
  se falhar, volta ao acesso. Logout chama `POST /auth/logout`, que revoga a
  sessão no servidor.
- **Erros**: a API devolve `ErrorResponse` com `message` e `field`; o
  formulário marca o campo indicado (ex.: nome de usuário em uso).
- **Tarefas**: período, situação, espaço, busca e ordenação vão como query de
  `GET /tasks` (com `today` = data do aparelho); os contadores dos filtros vêm
  de `meta.counts` e os do cabeçalho de `GET /tasks/summary`.
- **Espaços**: `GET /spaces` traz os contadores e o "Sem espaço"
  (`meta.unassigned`/`meta.showUnassigned`); os atalhos de "Novo espaço" vêm
  de `GET /spaces/suggestions`.
- **Conversas**: upload `multipart/form-data` em `POST /conversations`; a API
  reconhece o formato do WhatsApp, calcula os detalhes e evita duplicatas.
  "Usar um exemplo" chama `POST /conversations/sample`.
- **Chat**: `POST /chat/messages`, `/chat/retry` e `/chat/analysis` com
  `?stream=true` (SSE). O botão de parar fecha a conexão e a API salva o trecho
  recebido. Propostas de tarefas são confirmadas, editadas ou descartadas em
  `/chat/proposals/:id/*`; "Confirmar todas" usa
  `/chat/messages/:id/proposals/confirm-all`. As sugestões clicáveis vêm de
  `GET /chat/suggestions`.
- **Configurações**: tema e lembrete diário em `GET/PATCH /settings`; ao
  abrir o app, o fuso do aparelho é salvo para o "hoje" do servidor bater com
  o do usuário.
- **Lembrete diário**: o app consulta `GET /notifications` a cada minuto e ao
  voltar para a aba; a API gera o lembrete vencido na própria consulta. O aviso
  aparece no app e, com permissão, como notificação do sistema
  (`public/reminder-worker.js`); depois é marcado como lido.

## Estrutura

```text
index.html, tela-2.html, tela-3.html, inicio.html
css/                       tokens, base, componentes, responsivo, app
js/app.js                  telas de acesso
js/chat-app.js             inicialização do app (inicio.html)
js/api/client.js           fetch com token, refresh, erros, paginação e SSE
js/api/*.js                auth, tasks, spaces, conversations, chat, settings, notifications
js/components/             diálogos, cartões de tarefa/proposta, histórico, configurações
js/pages/                  telas (acesso, inicio, tarefas, espaços)
js/services/reminders.js   polling de notificações
js/utils/                  validação, datas, escape de HTML, Markdown seguro
public/                    fontes, ícones, imagens, Tailwind e service worker
```

## Limites

- Sem push com o app fechado: o lembrete aparece enquanto o app está aberto
  (ou quando ele volta a ser aberto).
- Os tokens ficam no `localStorage`, acessíveis a scripts da página. Todo
  conteúdo vindo da API é escapado antes de entrar no HTML, e as respostas da
  IA passam por um Markdown restrito.
- O texto da conversa aberta, o histórico recente e a lista de tarefas são
  enviados pela API ao OpenRouter a cada pergunta.
