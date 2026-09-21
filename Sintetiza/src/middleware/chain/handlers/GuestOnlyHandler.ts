import { BaseNavigationHandler, NavigationRequest } from "../NavigationHandler";

/**
 * Handler responsável por redirecionar usuários já autenticados para longe
 * de rotas exclusivas para convidados (ex: tela de /login).
 */
export class GuestOnlyHandler extends BaseNavigationHandler {
  public handle(request: NavigationRequest): void {
    const isAuthRoute = ["login", "register", "welcome"].includes(request.segments[0]);

    // Se o usuário já estiver logado e tentar abrir telas de login/cadastro/onboarding
    if (request.isAuthenticated && isAuthRoute) {
      request.redirect("/(tabs)");
      return; // Interrompe a cadeia após o redirecionamento
    }

    super.handle(request);
  }
}

