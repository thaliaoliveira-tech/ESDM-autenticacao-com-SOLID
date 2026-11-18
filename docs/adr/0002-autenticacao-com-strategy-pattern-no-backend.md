# ADR 0002: Autenticação do backend com Strategy Pattern

- **Status:** Aceito
- **Data:** 2026-11-18
- **Escopo:** Backend (`backend`, NestJS)

## Contexto

A API precisa autenticar usuários por mais de um mecanismo: e-mail/senha e
login com Google. Novos provedores podem surgir (por exemplo, GitHub ou
Apple).

Se a escolha do mecanismo ficar em condicionais, como
`if (provider === 'google')`, cada novo provedor obriga a alterar código já
testado e em produção. Isso viola o princípio aberto/fechado e mistura em uma
única classe regras de credenciais, chamadas a provedores externos e emissão de
token.

O critério de sucesso do projeto é **adicionar um segundo provedor sem alterar
o primeiro**.

## Decisão

Adotaremos o padrão **Strategy** para o passo de autenticação, com
arquitetura em camadas (`domain`, `application`, `infrastructure`,
`presentation`) e inversão de dependência por contratos.

1. **Contrato `AuthStrategy`**: cada mecanismo implementa
   `authenticate(input): Promise<AuthIdentity>` e responde a uma única
   pergunta: "quem é o usuário por trás desta entrada?".
2. **Implementações**: `EmailPasswordAuthStrategy` e `GoogleAuthStrategy`, em
   `application/strategies`.
3. **Registro por injeção de dependência**: as Strategies são injetadas como um
   array (`AUTH_STRATEGIES`). O `AuthService` as indexa em um `Map` por
   `provider` e falha na inicialização se houver duplicidade.
4. **Separação em duas etapas**: `authenticate` identifica o usuário e
   `issueSession` emite o token. Nenhum caminho emite token sem identidade
   confirmada.
5. **Contratos para dependências externas**: `PasswordHasher`, `TokenService` e
   `UserRepository` ficam no domínio. As implementações (`Argon2PasswordHasher`,
   `JwtTokenService`, `PrismaUserRepository`) ficam na infraestrutura.
6. **Passport como adaptador**: `passport-local`, `passport-jwt` e
   `passport-google-oauth20` ficam na camada de infraestrutura e delegam ao
   `AuthService`. A regra de negócio não depende do Passport.
7. **Contrato de erros (Liskov)**: toda Strategy lança
   `InvalidCredentialsError` para falha de credencial e
   `AuthenticationProviderError` para falha do provedor. Um filtro global
   (`ApplicationErrorFilter`) converte esses erros em respostas HTTP.

Fluxo resumido:

```text
AuthController -> AuthService -> AuthStrategy (Email | Google) -> UserRepository / PasswordHasher
                      |
                      +-> TokenService (JWT)
```

## Alternativas consideradas

### Condicionais por provedor no serviço

**Rejeitada:** cada novo provedor altera o `AuthService`, aumenta o risco de
regressão e dificulta os testes isolados.

### Usar somente Passport, sem camada própria

**Rejeitada:** acopla a regra de autenticação ao framework e exige subir o
Nest e o Passport para testar o comportamento.

### Serviço de autenticação por provedor, sem contrato comum

**Rejeitada:** o controller teria de conhecer cada serviço. Não haveria
substituição uniforme nem registro central.

### Delegar a autenticação a um serviço externo (Auth0, Keycloak)

**Rejeitada por ora:** adiciona infraestrutura e dependência de terceiros sem
valor para o escopo atual. Pode ser reavaliada.

## Consequências

### Benefícios

- Adicionar um provedor é criar uma classe e registrá-la, sem alterar
  `AuthService` nem as Strategies existentes.
- Cada Strategy e o `AuthService` podem ser testados com fakes, sem banco e sem
  framework.
- Argon2, JWT e Prisma podem ser trocados sem tocar na regra de negócio.
- Strategies duplicadas são detectadas na inicialização da aplicação.

### Custos e riscos

- Há mais arquivos e abstrações do que uma implementação direta.
- O `Map` usa `AuthStrategy<unknown>`. A tipagem do `input` por provedor é
  verificada de forma menos estrita em tempo de compilação.
- **O logout não invalida o token.** A rota responde `204` e o cliente deve
  descartar o JWT. A revogação exigiria blacklist ou Redis.
- Não há refresh token. O usuário precisa fazer login novamente quando o token
  expira.
- Cadastro, recuperação de senha e RBAC estão fora do escopo.
- As rotas do Google respondem `503` até que as credenciais sejam configuradas.
- O banco é SQLite, adequado a desenvolvimento e a POC, não a produção com
  múltiplas instâncias.

## Impacto no front-end

O front-end (ver [ADR 0001](0001-protecao-de-rotas-com-chain-of-responsibility.md))
ainda usa um mock no `AuthContext`. A integração deverá consumir
`POST /auth/login` e `GET /auth/me` e guardar o `accessToken` de forma segura.
Como o logout é apenas lógico, o app deve descartar o token localmente.

## Detalhes de implementação

- `backend/src/modules/auth/domain/contracts/auth-strategy.ts`
- `backend/src/modules/auth/application/auth.service.ts`
- `backend/src/modules/auth/application/strategies/email-password-auth.strategy.ts`
- `backend/src/modules/auth/application/strategies/google-auth.strategy.ts`
- `backend/src/modules/auth/infrastructure/auth.module.ts`
- `backend/src/shared/errors/application-error.filter.ts`

## Reavaliação

Revisitar se for necessário refresh token ou revogação, se o número de
provedores tornar o registro por `Map` insuficiente, ou se a autenticação for
delegada a um provedor de identidade externo.
