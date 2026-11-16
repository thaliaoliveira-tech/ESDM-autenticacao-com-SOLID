# ADR 0001: Proteger rotas com Chain of Responsibility

- **Status:** Aceito
- **Data:** 2026-11-16
- **Escopo:** Aplicativo mobile (`Sintetiza`)

## Contexto

O aplicativo possui rotas públicas de autenticação e onboarding (`welcome`,
`login` e `register`) e rotas que devem ser acessíveis somente por usuários
autenticados, como as abas principais e as telas de conteúdo.

As decisões de navegação dependem de mais de uma condição:

- o estado de autenticação ainda pode estar sendo carregado;
- determinadas rotas exigem autenticação;
- usuários autenticados não devem retornar às telas exclusivas para convidados;
- o comportamento de proteção deve poder ser ativado ou desativado conforme o
  estágio do aplicativo.

Concentrar todas essas regras em um único hook ou componente de navegação
torna o fluxo difícil de evoluir e mistura responsabilidades distintas. Também
torna mais arriscado acrescentar novas regras, como onboarding incompleto,
permissões ou manutenção da sessão.

## Decisão

Adotaremos o padrão **Chain of Responsibility** para processar as decisões de
navegação.

Cada regra será representada por um handler que:

1. recebe um contexto comum de navegação;
2. decide se consegue tratar a requisição;
3. interrompe a cadeia quando realiza um redirecionamento ou precisa aguardar;
4. delega ao próximo handler quando não se aplica.

A cadeia padrão será composta por:

```text
LoadingHandler -> AuthRequiredHandler -> GuestOnlyHandler
```

O `NavigationPipeline` será responsável somente por montar e executar a
cadeia. O hook `useAuthMiddleware` é o ponto de integração com o React, o Expo
Router e o `AuthContext`; sua integração com a pipeline deve fornecer o callback
de redirecionamento e o estado atual.

O comportamento definido é:

| Condição | Resultado |
| --- | --- |
| Estado de autenticação carregando | interrompe o processamento sem redirecionar |
| Proteção exigida, usuário não autenticado e rota privada | redireciona para `/welcome` |
| Usuário autenticado em rota de convidado | redireciona para `/(tabs)` |
| Nenhuma regra aplicável | mantém a rota atual |

A proteção estrita permanece opt-in por meio de `requireAuth`, com valor
`false` no estágio atual do aplicativo. Isso permite integrar a navegação antes
da conclusão da autenticação real sem bloquear o fluxo de desenvolvimento.

## Alternativas consideradas

### Condicionais diretamente no layout

Foi considerada a implementação de todos os `if` no layout principal ou em um
único hook.

**Rejeitada:** concentra regras de naturezas diferentes em um único ponto e
exige alterar o mesmo componente sempre que uma nova regra de navegação surgir.

### Guard separado para cada rota

Foi considerada a configuração manual de proteção em cada tela.

**Rejeitada:** duplica a leitura do estado de autenticação e pode produzir
comportamentos inconsistentes entre rotas.

### Uma função de autorização sem encadeamento

Foi considerada uma função que avalia todas as condições e retorna um destino.

**Rejeitada:** embora simples inicialmente, mantém as regras acopladas e não
permite inserir ou substituir etapas de processamento de forma independente.

## Consequências

### Benefícios

- Cada handler possui uma responsabilidade única.
- Novas regras podem ser adicionadas à cadeia sem alterar as existentes.
- Os handlers podem ser testados sem montar telas ou iniciar o Expo Router.
- A ordem de processamento fica explícita e pode ser alterada na composição da
  pipeline.
- O comportamento de carregamento evita redirecionamentos prematuros.

### Custos e riscos

- A ordem dos handlers passa a ser relevante e precisa ser documentada.
- O padrão adiciona mais classes e abstrações do que condicionais simples.
- Um handler que não delegar corretamente pode interromper o fluxo de forma
  inesperada.
- Enquanto `requireAuth` permanecer desativado, a proteção de rotas privadas
  não será aplicada em produção.
- O estado de autenticação ainda é inicializado por um mock; a persistência
  segura do token e a integração com a API são decisões futuras.

## Detalhes de implementação

Os contratos e a composição ficam em:

- `Sintetiza/src/middleware/chain/NavigationHandler.ts`
- `Sintetiza/src/middleware/chain/NavigationPipeline.ts`
- `Sintetiza/src/middleware/chain/handlers/LoadingHandler.ts`
- `Sintetiza/src/middleware/chain/handlers/AuthRequiredHandler.ts`
- `Sintetiza/src/middleware/chain/handlers/GuestOnlyHandler.ts`

O ponto de entrada do React é:

- `Sintetiza/src/middleware/useAuthMiddleware.ts`

Antes de habilitar `requireAuth` por padrão, devem ser concluídos:

1. persistência segura e restauração do token;
2. integração do `AuthContext` com a API;
3. testes de navegação para carregamento, usuário convidado e usuário
   autenticado;
4. validação do comportamento de retorno e redirecionamento no Expo Router.

## Reavaliação

Esta decisão deve ser revisitada se o Expo Router passar a oferecer um
mecanismo nativo que cubra as mesmas regras sem duplicação, ou se a aplicação
adotar autorização baseada em permissões suficientemente complexa para exigir
um serviço dedicado de políticas.
