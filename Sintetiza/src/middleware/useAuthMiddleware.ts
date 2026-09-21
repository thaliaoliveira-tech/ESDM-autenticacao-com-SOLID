import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "../context/AuthContext";

interface AuthMiddlewareOptions {
  /**
   * Ative para forçar o redirecionamento caso o usuário não esteja autenticado.
   * Enquanto você não implementar a lógica de login completa, pode manter como false.
   */
  requireAuth?: boolean;
}

/**
 * Middleware de Autenticação para Expo Router.
 *
 * Monitora as rotas acessadas e o estado de autenticação:
 * - Redireciona para /login se tentar acessar rotas protegidas sem autenticação.
 * - Redireciona para /(tabs) se já estiver autenticado e tentar acessar /login.
 */
export function useAuthMiddleware(options: AuthMiddlewareOptions = { requireAuth: false }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Verifica se a rota atual é de autenticação / onboarding (ex: login, register, welcome)
    const inAuthGroup = ["login", "register", "welcome"].includes(segments[0]);

    // Se o middleware estiver configurado para exigir autenticação estrita
    if (options.requireAuth) {
      if (!isAuthenticated && !inAuthGroup) {
        // Redireciona para welcome se não estiver autenticado
        router.replace("/welcome");
      } else if (isAuthenticated && inAuthGroup) {
        // Redireciona para as abas principais se já estiver logado
        router.replace("/(tabs)");
      }
    }
  }, [isAuthenticated, segments, isLoading, options.requireAuth]);

  return {
    isAuthenticated,
    isLoading,
  };
}

