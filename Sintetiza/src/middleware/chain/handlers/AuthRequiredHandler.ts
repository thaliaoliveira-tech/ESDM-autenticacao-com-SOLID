import { BaseNavigationHandler, NavigationRequest } from "../NavigationHandler";

/**
 * Handler responsável por proteger rotas que exigem usuário autenticado.
 * Redireciona para /login caso o usuário não esteja logado.
 */
export class AuthRequiredHandler extends BaseNavigationHandler {
  public handle(request: NavigationRequest): void {
    const isAuthRoute = ["login", "register", "welcome"].includes(request.segments[0]);

    // Se autenticação estrita estiver ativada e o usuário não estiver logado
    if (request.requireAuth && !request.isAuthenticated && !isAuthRoute) {
      request.redirect("/welcome");
      return; // Interrompe a cadeia após tratar a requisição
    }

    super.handle(request);
  }
}

