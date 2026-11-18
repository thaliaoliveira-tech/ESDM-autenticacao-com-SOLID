import { useEffect, useMemo } from "react";
import { useRouter, useSegments, type Href } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { NavigationPipeline } from "./chain";

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
 * Adaptador entre React/Expo Router/AuthContext e a NavigationPipeline
 * (Chain of Responsibility). As regras ficam nos handlers:
 * - Redireciona para /welcome se tentar acessar rotas protegidas sem autenticação.
 * - Redireciona para /(tabs) se já estiver autenticado e tentar acessar rotas de convidado.
 */
export function useAuthMiddleware(options: AuthMiddlewareOptions = { requireAuth: false }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pipeline = useMemo(() => new NavigationPipeline(), []);

  useEffect(() => {
    // A proteção é opt-in: sem requireAuth, a cadeia não é executada.
    if (!options.requireAuth) return;

    pipeline.execute({
      segments,
      isAuthenticated,
      isLoading,
      user,
      requireAuth: true,
      redirect: (path) => router.replace(path as Href),
    });
  }, [isAuthenticated, segments, isLoading, user, options.requireAuth, pipeline]);

  return {
    isAuthenticated,
    isLoading,
  };
}

