import { User } from "../../context/AuthContext";

/**
 * Contexto da requisição de navegação repassado entre os elos da cadeia.
 */
export interface NavigationRequest {
  segments: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  requireAuth: boolean;
  redirect: (path: string) => void;
}

/**
 * Interface do Handler para o padrão Chain of Responsibility (GoF).
 */
export interface NavigationHandler {
  setNext(handler: NavigationHandler): NavigationHandler;
  handle(request: NavigationRequest): void;
}

/**
 * Classe base abstrata que implementa o encadeamento padrão.
 */
export abstract class BaseNavigationHandler implements NavigationHandler {
  private nextHandler: NavigationHandler | null = null;

  public setNext(handler: NavigationHandler): NavigationHandler {
    this.nextHandler = handler;
    return handler;
  }

  public handle(request: NavigationRequest): void {
    if (this.nextHandler) {
      this.nextHandler.handle(request);
    }
  }
}

