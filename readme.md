# Sintetiza

O **Sintetiza** é um aplicativo desenvolvido para a disciplina de **Engenharia de Software para Dispositivos Móveis (ESDM)**. 

O principal objetivo da plataforma é facilitar o acompanhamento e a compreensão de discussões extensas ou complexas que ocorrem no WhatsApp. Através do app, o usuário pode importar o histórico de uma conversa e, a partir disso, abrir um chat com uma Inteligência Artificial. Essa IA atua como um assistente contextualizado: você pode fazer perguntas sobre o que já foi discutido, pedir resumos das decisões e solicitar informações pertinentes para entender rapidamente o contexto e conseguir contribuir de forma efetiva com a conversa original.

**Público e Foco do Aplicativo:**
O Sintetiza foi desenhado especialmente para **grupos de trabalhos escolares, universitários e equipes corporativas**. Nesses ambientes, acordos e informações cruciais costumam se perder em meio a inúmeras mensagens. O app surge como uma ferramenta essencial para nivelar o conhecimento da equipe, economizar tempo de leitura e garantir que todos os membros estejam prontos para colaborar.

## Como rodar o projeto

### Backend (NestJS)

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
4. Crie o banco de dados (SQLite) e rode o seed inicial:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
5. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run start:dev
   ```

A API estará rodando em `http://localhost:3000`. Você pode acessar a documentação interativa (Swagger) em `http://localhost:3000/docs`.

### Frontend (React Native)

*(Em breve: Instruções para configuração e execução do aplicativo React Native)*