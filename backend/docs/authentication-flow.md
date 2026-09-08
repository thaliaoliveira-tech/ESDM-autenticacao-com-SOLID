# Fluxos de autenticação

## Login por e-mail e senha

```mermaid
sequenceDiagram
    participant C as Cliente
    participant G as LocalAuthGuard
    participant PS as LocalPassportStrategy
    participant AS as AuthService
    participant ST as EmailPasswordAuthStrategy
    participant UR as UserRepository
    participant PH as PasswordHasher
    participant TS as TokenService

    C->>G: POST /auth/login { email, password }
    G->>G: valida o LoginDto
    Note over G: corpo inválido → 400,<br/>antes de tocar em senha
    G->>PS: extrai credenciais
    PS->>AS: authenticate('email', creds)
    AS->>ST: authenticate(creds)
    ST->>UR: findByEmail(email)
    UR-->>ST: User | null
    ST->>PH: verify(password, hash)
    PH-->>ST: true
    ST-->>AS: AuthIdentity
    AS-->>PS: AuthIdentity
    PS-->>C: request.user preenchido
    C->>AS: (controller) issueSession(identity)
    AS->>TS: generate(identity)
    TS-->>AS: JWT
    AS-->>C: 200 { accessToken, tokenType, expiresIn, user }
```

### Por que o guard valida o DTO

No NestJS, **guards rodam antes dos pipes**. Sem a validação dentro de
[`LocalAuthGuard`](../src/modules/auth/infrastructure/guards/local-auth.guard.ts),
um corpo malformado seria rejeitado pelo Passport como `401`, quando o correto
é `400`: o cliente errou a requisição, não a senha.

| Situação | Status |
| -------- | ------ |
| corpo ausente, e-mail inválido, senha curta, campo desconhecido | `400` |
| e-mail não cadastrado | `401` |
| senha incorreta | `401` |
| usuário existe mas só tem conta Google | `401` |

### Por que a mensagem de erro é sempre a mesma

`InvalidCredentialsError` é lançado com o mesmo texto para "usuário não existe"
e "senha errada". Mensagens diferentes permitiriam descobrir quais e-mails
estão cadastrados, um por um.

> **Limite conhecido.** A resposta é idêntica, mas o *tempo* de resposta não:
> quando o usuário existe, o Argon2 roda; quando não existe, retornamos antes.
> Um atacante paciente consegue medir isso. Mitigar exigiria verificar um hash
> descartável no caminho de "usuário inexistente". Ficou de fora do escopo, mas
> a limitação é real e está registrada aqui.

---

## Rota protegida — `GET /auth/me`

```mermaid
sequenceDiagram
    participant C as Cliente
    participant G as JwtAuthGuard
    participant JS as JwtPassportStrategy
    participant UR as UserRepository
    participant CT as AuthController

    C->>G: GET /auth/me + Bearer token
    G->>JS: valida assinatura e expiração
    JS->>UR: findById(claims.sub)
    UR-->>JS: User | null
    Note over JS: usuário removido → 401,<br/>mesmo com token válido
    JS-->>CT: request.user = AuthIdentity
    CT-->>C: 200 { userId, email, name, provider }
```

A consulta ao repositório é deliberada. Um JWT continua criptograficamente
válido depois que o usuário some do banco; sem essa checagem, o token ainda
abriria a rota.

---

## Login com Google

```mermaid
sequenceDiagram
    participant C as Navegador
    participant GG as GoogleAuthGuard
    participant P as Passport Google
    participant GS as GoogleAuthStrategy
    participant UR as UserRepository
    participant TS as TokenService

    C->>GG: GET /auth/google
    GG->>GG: credenciais configuradas?
    Note over GG: se não → 503 com instrução clara
    GG-->>C: 302 para o consentimento do Google
    C->>P: GET /auth/google/callback?code=...
    P->>P: troca code por perfil
    P->>GS: authenticate(GoogleProfile normalizado)
    GS->>UR: findByGoogleId
    alt já autenticou por Google antes
        UR-->>GS: User
    else existe conta local com o mesmo e-mail
        GS->>UR: linkGoogleAccount(userId, googleId)
        UR-->>GS: User vinculado
    else primeiro acesso
        GS->>UR: createFromGoogle(profile)
        UR-->>GS: User novo, sem senha local
    end
    GS-->>TS: AuthIdentity
    TS-->>C: 200 { accessToken, ... }
```

### Adaptação consciente em relação ao material da aula

No exemplo do professor o cliente é Flutter, e o Google Sign-In basta: não há
necessidade de um `TokenManager` próprio.

Aqui o contexto é diferente. Quem precisa ser protegido são os endpoints
**desta API**, então o backend emite o próprio JWT após confirmar a identidade
no Google. O token do Google autentica *quem é a pessoa*; o JWT da API autoriza
*o acesso a esta API*.

### Três caminhos, uma decisão de produto

O `else if` dentro de `GoogleAuthStrategy` não é o `if/else` que a arquitetura
proíbe. Aquele seria sobre **qual provedor usar**; este é sobre **o estado da
conta**, e vive dentro da Strategy a que pertence.

Vincular por e-mail (caminho 2) é uma escolha: assume-se que o Google verificou
o endereço. Se essa premissa não valesse, o vínculo automático permitiria tomar
contas alheias.

---

## JWT

Payload no fio:

```json
{
  "sub": "clx0000000000000000000000",
  "email": "demo@example.com",
  "provider": "email",
  "iat": 1767225600,
  "exp": 1767229200
}
```

A tradução entre `sub` (JWT) e `subject` (aplicação) acontece dentro de
[`JwtTokenService`](../src/modules/auth/infrastructure/security/jwt-token.service.ts),
e só ali. O contrato `TokenService` não menciona a palavra "JWT" de propósito:
JWT é a implementação escolhida, não o contrato.

Configuração:

```env
JWT_SECRET=...
JWT_EXPIRES_IN=1h
```

**Sem refresh token neste POC.** Quando o access token expira, é preciso fazer
login de novo.

---

## Logout

```
POST /auth/logout  →  204 No Content
```

O endpoint exige autenticação e **não faz nada no servidor**.

> **Limitação intencional, e é importante saber explicá-la.**
> O JWT é stateless. Não há blacklist, não há revogação. Depois do logout, o
> token continua criptograficamente válido até `exp`. O contrato real é:
> *o cliente deve descartar o access token*.
>
> Há um teste E2E que documenta esse comportamento explicitamente —
> `'o token CONTINUA valido depois do logout'` — para que ninguém o descubra
> como se fosse um bug.

Revogação de verdade exigiria uma destas rotas, todas fora do escopo:

| Abordagem | Custo |
| --------- | ----- |
| Blacklist de tokens | armazenamento compartilhado (Redis) e consulta a cada request |
| Sessões no banco | o token deixa de ser stateless; consulta a cada request |
| Access curto + refresh | dois tokens, rotação, endpoint novo, mais superfície |

Para um POC cujo objetivo é demonstrar SOLID no ponto de extensão da
autenticação, qualquer uma delas adicionaria infraestrutura sem adicionar
clareza.
