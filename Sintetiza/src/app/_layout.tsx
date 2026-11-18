import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { AuthProvider } from "../context/AuthContext";
import { useAuthMiddleware } from "../middleware/useAuthMiddleware";

// Rota inicial do Stack raiz quando a URL não aponta para uma tela específica
// ou quando a rota pedida está protegida (convidados começam em /welcome).
export const unstable_settings = {
  initialRouteName: "welcome",
};

function NavigationLayout() {
  const REQUIRE_AUTH = true;
  const { isAuthenticated } = useAuthMiddleware({ requireAuth: REQUIRE_AUTH });
  const allowTabs = !REQUIRE_AUTH || isAuthenticated;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Tela de Boas-vindas (Onboarding): primeira da pilha, é a rota inicial de convidados */}
      <Stack.Screen
        name="welcome"
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: "slide_from_left",
        }}
      />

      {/* Abas com gesto de voltar desativado */}
      <Stack.Protected guard={allowTabs}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack.Protected>

      {/* Tela de Login */}
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />

      {/* Tela de Cadastro */}
      <Stack.Screen
        name="register"
        options={{
          headerShown: false,
          animation: "slide_from_right",
          gestureEnabled: true,
        }}
      />

      {/* Tela de Artigo em Tela Cheia - Gesto de voltar ativado */}
      <Stack.Screen
        name="artigo/[id]"
        options={{
          headerShown: false,
          gestureEnabled: true, // <-- Gesto nativo de puxar da borda esquerda para voltar
          animation: "slide_from_right",
        }}
      />

      {/* Tela de Histórico Completo de Resumos (acessada a partir de Espaços) */}
      <Stack.Screen
        name="resumos"
        options={{
          headerShown: false,
          gestureEnabled: true,
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <NavigationLayout />
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}
