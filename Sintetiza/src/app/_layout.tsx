import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { AuthProvider } from "../context/AuthContext";
import { useAuthMiddleware } from "../middleware/useAuthMiddleware";

function NavigationLayout() {
  const REQUIRE_AUTH = false;
  const { isAuthenticated } = useAuthMiddleware({ requireAuth: REQUIRE_AUTH });
  const allowTabs = !REQUIRE_AUTH || isAuthenticated;

  return (
    <Stack screenOptions={{ headerShown: false }}>
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
          animation: "slide_from_left",
          gestureEnabled: false,
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
