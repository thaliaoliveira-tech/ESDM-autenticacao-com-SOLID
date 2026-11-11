# Documentação

Índice da documentação do backend do Sintetiza.

| # | Documento | O que responde |
| - | --------- | -------------- |
| 1 | [modules.md](modules.md) | Módulos, regras de negócio e cada tela do protótipo → endpoint |
| 2 | [architecture.md](architecture.md) | Como o projeto está organizado e por quê |
| 3 | [solid.md](solid.md) | Qual classe demonstra cada princípio SOLID |
| 4 | [authentication-flow.md](authentication-flow.md) | Cadastro, login, convidado, sessões, refresh, logout e recuperação de senha |
| 5 | [database.md](database.md) | Modelo de dados, relacionamentos, índices, migrations, seed e transações |
| 6 | [testing.md](testing.md) | Pirâmide de testes, mocks, cobertura |
| 7 | [swagger/api.swagger.yaml](swagger/api.swagger.yaml) | Contrato da API (fonte oficial) |

---

## Por que a documentação da API é um arquivo, e não decorators

A prática mais comum no NestJS é anotar controllers e DTOs com
`@ApiOperation`, `@ApiResponse`, `@ApiBody` e `@ApiProperty`, deixando o
Swagger ser gerado a partir do código.

Aqui a escolha foi a oposta: **`docs/swagger/api.swagger.yaml` é a fonte
oficial**, escrita à mão, e o Nest apenas a serve em `/docs`.

**Ganhos**

- A descrição da API cabe em um arquivo que se lê de ponta a ponta, em vez de
  ficar espalhada por dezenas de decorators.
- Os controllers ficam limpos: sobra apenas a lógica de borda, o que torna o
  ponto arquitetural do exercício muito mais visível.
- O contrato pode ser revisado em um diff só, e versionado como documento.

**Preço, que é real e precisa ser dito**

- O arquivo pode divergir do código, porque nada os força a concordar.

**Como esse preço é mitigado**

- `npm run docs:lint` valida o OpenAPI e quebra se ele estiver malformado.
- Os testes E2E exercitam exatamente os status codes e formatos descritos no
  YAML: se o código mudar de contrato, o E2E acusa.

Em um sistema de produção com muitos endpoints, a geração automática costuma
ser a escolha certa. Para este POC — poucos endpoints, foco didático — o
arquivo único ganha.

---

## Como visualizar os diagramas

Os documentos usam [Mermaid](https://mermaid.js.org/). Para vê-los renderizados
no VS Code, instale **Markdown Preview Mermaid Support** (Matt Bierner) e abra o
preview com `Ctrl + Shift + V`.

No GitHub, os diagramas Mermaid renderizam nativamente.
