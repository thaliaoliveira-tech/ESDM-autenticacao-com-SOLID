import { NavigationHandler, NavigationRequest } from "./NavigationHandler";
import { LoadingHandler } from "./handlers/LoadingHandler";
import { AuthRequiredHandler } from "./handlers/AuthRequiredHandler";
import { GuestOnlyHandler } from "./handlers/GuestOnlyHandler";

/**
 * Pipeline que orquestra a cadeia de handlers de navegação (Chain of Responsibility).
 *
 * Segue os princípios SOLID:
 * - SRP: Apenas monta e dispara a cadeia.
 * - OCP: Permite injetar novos handlers personalizados sem modificar o fluxo interno.
 * - DIP: Depende da abstração NavigationHandler.
 */
export class NavigationPipeline {
  private head: NavigationHandler;

  constructor(handlers?: NavigationHandler[]) {
    if (handlers && handlers.length > 0) {
      // Encadeia os handlers passados por injeção
      for (let i = 0; i < handlers.length - 1; i++) {
        handlers[i].setNext(handlers[i + 1]);
      }
      this.head = handlers[0];
    } else {
      // Cadeia padrão do middleware de navegação
      const loading = new LoadingHandler();
      const auth = new AuthRequiredHandler();
      const guest = new GuestOnlyHandler();

      loading.setNext(auth).setNext(guest);
      this.head = loading;
    }
  }

  /**
   * Executa a requisição ao longo de todos os elos da cadeia.
   */
  public execute(request: NavigationRequest): void {
    this.head.handle(request);
  }
}

