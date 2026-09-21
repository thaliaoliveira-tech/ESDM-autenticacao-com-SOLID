export interface Artigo {
  id: string;
  titulo: string;
  categoria: string;
  tempo: string;
  data: string;
  trecho: string;
  conteudo: string[];
}

export const ARTIGOS: Record<string, Artigo> = {
  "1": {
    id: "1",
    titulo: "Princípio da Responsabilidade Única (SRP)",
    categoria: "Artigos",
    tempo: "4 min",
    data: "21 Set",
    trecho:
      "Uma classe deve ter um, e apenas um, motivo para mudar. Como desacoplar regras de negócio de persistência.",
    conteudo: [
      "O Princípio da Responsabilidade Única (Single Responsibility Principle - SRP) é o primeiro dos cinco princípios do SOLID, formulado por Robert C. Martin (Uncle Bob).",
      "Segundo o SRP, um módulo, classe ou função deve ter apenas um motivo para mudar, o que significa que ele deve ser responsável por apenas um ator ou uma única parte da funcionalidade do software.",
      "Quando uma classe acumula múltiplas responsabilidades (por exemplo, lidar com regras de negócio, persistência de banco de dados e envio de e-mails), qualquer alteração em um desses requisitos pode quebrar o funcionamento dos demais.",
      "Ao isolar essas preocupações em serviços e repositórios separados, o código torna-se muito mais fácil de testar, manter e evoluir ao longo do tempo.",
    ],
  },
  "2": {
    id: "2",
    titulo: "Clean Architecture no Frontend",
    categoria: "Livros",
    tempo: "8 min",
    data: "20 Set",
    trecho:
      "Isolamento da camada de apresentação da camada de domínio, permitindo testes unitários e reutilização de regras.",
    conteudo: [
      "A Arquitetura Limpa (Clean Architecture) proposta por Uncle Bob estabelece que o núcleo da aplicação não deve depender de frameworks, bibliotecas de UI ou detalhes de infraestrutura.",
      "No desenvolvimento mobile com React Native e Expo, isso significa separar componentes visuais (Views) dos casos de uso (Use Cases) e das entidades de negócio.",
      "Essa separação garante que a lógica de validação, cálculos e fluxos de usuário possam ser testados de maneira 100% isolada e reutilizados até mesmo se a interface gráfica for completamente refeita.",
    ],
  },
  "3": {
    id: "3",
    titulo: "Alinhamento Técnico - Sprint 12",
    categoria: "Reuniões",
    tempo: "2 min",
    data: "18 Set",
    trecho:
      "Definição da estratégia de autenticação JWT com Refresh Tokens e suporte a Biometria nativa.",
    conteudo: [
      "Reunião de alinhamento sobre a infraestrutura de segurança do app Sintetiza.",
      "Pontos decididos:",
      "1. Implementação de Refresh Tokens rotativos para manter o usuário logado com segurança.",
      "2. Armazenamento seguro de credenciais utilizando Keychain no iOS e Keystore no Android.",
      "3. Middleware de navegação estruturado com Chain of Responsibility para validar estados de sessão antes da renderização de rotas protegidas.",
    ],
  },
  "4": {
    id: "4",
    titulo: "Inversão de Dependência com NestJS",
    categoria: "Artigos",
    tempo: "6 min",
    data: "15 Set",
    trecho:
      "Uso de Interfaces e Tokens customizados de injeção para desacoplar implementações de repositórios.",
    conteudo: [
      "O Princípio da Inversão de Dependência (DIP) afirma que módulos de alto nível não devem depender de módulos de baixo nível; ambos devem depender de abstrações.",
      "No framework NestJS, esse princípio é implementado com o container de Injeção de Dependências nativo através de Symbol Tokens e Interfaces TypeScript.",
      "Dessa forma, o serviço de autenticação pode depender de uma interface `IAuthRepository`, permitindo trocar facilmente a implementação de Prisma para TypeORM ou mock em testes unitários.",
    ],
  },
};

