import { BaseNavigationHandler, NavigationRequest } from "../NavigationHandler";

/**
 * Handler responsável por redirecionar usuários já autenticados para longe
 * de rotas exclusivas para convidados (ex: tela de /login).
 */
export class GuestOnlyHandler extends BaseNavigationHandler {
  public handle(request: NavigationRequest): void {
    const isLoginRoute = request.segments[0] === "login";

    // Se o usuário já estiver logado e tentar abrir a tela de login
    if (request.isAuthenticated && isLoginRoute) {
      request.redirect("/(tabs)");
      return; // Interrompe a cadeia após o redirecionamento
    }

    super.handle(request);
  }
}

