# Sintetiza 🌀

> Transforme conversas longas do WhatsApp em sínteses estruturadas, tarefas e ações com Inteligência Artificial.

Projeto desenvolvido para a disciplina de **Engenharia de Software para Dispositivos Móveis (ESDM)**, com foco em arquitetura escalável, princípios **SOLID** e padrões de projeto (**Design Patterns**).

---

## 📌 Descrição

O **Sintetiza** é uma aplicação que utiliza inteligência artificial para transformar conversas exportadas do WhatsApp em informações organizadas, permitindo ao usuário **entender, consultar e transformar o conteúdo das conversas em ações**.

Em vez de o usuário precisar reler longas conversas para descobrir o que foi decidido, o que ficou pendente ou o que precisa ser feito, o Sintetiza estrutura essas informações e as disponibiliza de forma simples, visual e contextualizada.

### A Lógica Central da Plataforma

```
  ┌─────────────┐      ┌───────────┐      ┌───────────────┐      ┌──────────┐
  │   Conversa  │ ───► │  Síntese  │ ───► │  Organização  │ ───► │   Ação   │
  └─────────────┘      └───────────┘      └───────────────┘      └──────────┘
```

- **Conversa**: Importação direta do histórico exportado de conversas e grupos do WhatsApp.
- **Síntese**: Processamento com IA que resume discussões extensas, elimina ruídos e identifica os pontos cruciais.
- **Organização**: Estruturação dos dados por **Espaços** temáticos (ex.: *Trabalho*, *Faculdade*, *Projetos*).
- **Ação**: Mapeamento claro de **Tarefas** e **Pendências** com prazos e status, além de um chat assistente contextual (*"Pergunte ao Sintetiza..."*) para consultas instantâneas.

---

## 🎯 Público-Alvo e Foco do Aplicativo

O Sintetiza foi desenhado especialmente para **grupos de trabalhos escolares, universitários e equipes corporativas**.

Nesses ambientes, acordos, decisões e prazos frequentemente se perdem em meio a centenas de mensagens, áudios e conversas paralelas. O app surge como uma ferramenta essencial para:
- **Economizar tempo** de leitura e busca de informações passadas;
- **Nivelar o conhecimento** de toda a equipe ou grupo de estudo;
- **Acelerar a colaboração**, garantindo que todos os membros saibam exatamente o que foi decidido e quais são os próximos passos.

---

## ⚙️ Arquitetura e Engenharia de Software

O repositório reflete as boas práticas de Engenharia de Software modernas, aplicando rigorosamente os princípios **SOLID** e padrões de projeto estruturais e comportamentais (GoF):

### 🔹 Backend (NestJS & Prisma)
- **Framework**: NestJS com TypeScript, organizado por módulos de domínio (`auth`, `users`, `settings`, `spaces`, `tasks`, `conversations`, `chat`, `notifications`, `audit`), cada um com as camadas `domain` → `application` → `presentation`/`infrastructure`.
- **Banco de Dados**: SQLite via Prisma ORM, com migrations versionadas, integridade referencial, índices e transações.
- **Padrão Strategy (GoF)**: autenticação por e-mail/senha e **convidado**, cada uma uma Strategy registrada sem `if/else` (**Princípio Aberto/Fechado**). Sessões com JWT + refresh token rotativo e logout real.
- **IA**: chat sobre a conversa importada (DeepSeek via OpenRouter) com streaming, análise automática e **propostas de tarefas que só são salvas após confirmação**.
- **Notificações**: o app consulta periodicamente; a própria consulta gera o lembrete diário vencido. Um job apenas limpa sessões e convidados expirados.
- **Documentação de API**: Swagger OpenAPI em `/docs`; detalhes em `backend/README.md` e `backend/docs/`.

### 🔹 Frontend Mobile (React Native & Expo)
- **Framework**: React Native com Expo (SDK 52/53) e TypeScript.
- **Navegação Nativa**: Expo Router utilizando **iOS Native Tabs** (`NativeTabs`) e **Stack Navigation** com controle fino de histórico e suporte a gestos do sistema.
- **Padrão Chain of Responsibility (GoF)**: Middleware de navegação implementado como uma cadeia de responsabilidade (`LoadingHandler` → `AuthRequiredHandler` → `GuestOnlyHandler`), garantindo proteção de rotas e separação de interesses sem acoplamento entre as validações.
- **UI & Experiência**: Telas de Boas-vindas, Login, Cadastro e Home (Dashboard de Espaços e Próximas Tarefas) fiéis a mockups de alta fidelidade e com suporte completo a tema escuro (Dark Mode).

---

## 📁 Estrutura do Repositório

```
ESDM-autenticacao-com-SOLID/
├── backend/                  # API NestJS (auth, tarefas, espaços, conversas, chat com IA, lembretes)
│   ├── src/                  # Módulos de domínio: domain, application, presentation, infrastructure
│   ├── prisma/               # Schema do banco, migrações e seeds
│   ├── test/                 # Testes unitários, de integração (SQLite real) e E2E
│   └── docs/                 # Arquitetura, banco, módulos, fluxos e Swagger/OpenAPI
│
└── Sintetiza/                # Aplicativo Mobile (React Native + Expo)
    ├── src/
    │   ├── app/              # Rotas e páginas (Expo Router)
    │   │   ├── (tabs)/       # Abas principais (Início, Resumos, Conta)
    │   │   ├── welcome.tsx   # Tela de Boas-vindas / Onboarding
    │   │   ├── login.tsx     # Tela de Login com reset de stack
    │   │   └── register.tsx  # Tela de Cadastro
    │   ├── components/       # Componentes reutilizáveis (SintetizaLogo, SocialAuthButtons)
    │   ├── context/          # Contexto global de autenticação (AuthContext)
    │   └── middleware/       # Middleware de autenticação com Chain of Responsibility
    └── package.json
```

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- Gerenciador de pacotes [pnpm](https://pnpm.io/) (recomendado para o mobile) ou [npm](https://www.npmjs.com/)
- Aplicativo [Expo Go](https://expo.dev/go) no smartphone ou emulador iOS/Android configurado

---

### 1️⃣ Backend (NestJS)

1. Acesse a pasta do backend:
   ```bash
   cd backend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Copie o arquivo de configuração de ambiente:
   ```bash
   cp .env.example .env
   ```

4. Crie o banco de dados (SQLite) e execute o seed inicial:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run start:dev
   ```

A API estará rodando em `http://localhost:3000`. Você pode acessar a documentação interativa (Swagger) em `http://localhost:3000/docs`.

---

### 2️⃣ Frontend (React Native / Expo)

1. Em um novo terminal, acesse a pasta do aplicativo:
   ```bash
   cd Sintetiza
   ```

2. Instale as dependências:
   ```bash
   pnpm install
   ```

3. Inicie o servidor de desenvolvimento do Expo:
   ```bash
   pnpm start
   ```

4. Para visualizar o aplicativo:
   - **Dispositivo físico**: Abra o app **Expo Go** e escaneie o QR Code exibido no terminal.
   - **Emulador iOS**: Pressione `i` no terminal.
   - **Emulador Android**: Pressione `a` no terminal.
   - **Web**: Pressione `w` no terminal.