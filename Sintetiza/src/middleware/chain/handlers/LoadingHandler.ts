import { BaseNavigationHandler, NavigationRequest } from "../NavigationHandler";

/**
 * Handler responsável por suspender o processamento da cadeia enquanto
 * o estado de autenticação ou token estiver sendo carregado do armazenamento.
 */
export class LoadingHandler extends BaseNavigationHandler {
  public handle(request: NavigationRequest): void {
    if (request.isLoading) {
      // Interrompe a cadeia enquanto o estado de auth carrega
      return;
    }
    super.handle(request);
  }
}

