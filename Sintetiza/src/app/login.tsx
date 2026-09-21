import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { ChartColumnBig } from "lucide-react-native";

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { signIn, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleLogin = async () => {
    // Chama o método do middleware/contexto (usuário implementará a API depois)
    await signIn(email, senha);
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000000" : "#F2F2F7" },
      ]}
    >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header / Marca */}
            <View style={styles.header}>
              <ChartColumnBig />
              <Text
                style={[
                  styles.title,
                  { color: isDark ? "#FFFFFF" : "#000000" },
                ]}
              >
                Sintetiza
              </Text>
            </View>

            {/* Formulário estilo iOS Inset */}
            <View
              style={[
                styles.formCard,
                { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
              ]}
            >
              <View style={styles.inputRow}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: isDark ? "#8E8E93" : "#6E6E73" },
                  ]}
                >
                  E-mail
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: isDark ? "#FFFFFF" : "#000000" },
                  ]}
                  placeholder="email@example.com"
                  placeholderTextColor={isDark ? "#545458" : "#C7C7CC"}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View
                style={[
                  styles.separator,
                  { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" },
                ]}
              />

              <View style={styles.inputRow}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: isDark ? "#8E8E93" : "#6E6E73" },
                  ]}
                >
                  Senha
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: isDark ? "#FFFFFF" : "#000000" },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={isDark ? "#545458" : "#C7C7CC"}
                  secureTextEntry
                  value={senha}
                  onChangeText={setSenha}
                />
              </View>
            </View>

            {/* Ações */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && { opacity: 0.7 },
              ]}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Text>
            </TouchableOpacity>

            {/* Links Auxiliares */}
            <View style={styles.footer}>
              <TouchableOpacity activeOpacity={0.6}>
                <Text style={styles.footerLink}>Esqueci minha senha</Text>
              </TouchableOpacity>
              <Text style={{ color: isDark ? "#545458" : "#C7C7CC" }}>•</Text>
              <TouchableOpacity activeOpacity={0.6}>
                <Text style={styles.footerLink}>Criar uma conta</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingVertical: 32,
  },
  header: {
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280,
  },
  formCard: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputLabel: {
    width: 70,
    fontSize: 16,
    fontWeight: "500",
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  loginButton: {
    backgroundColor: "#007AFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  skipButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 12,
  },
  footerLink: {
    color: "#8E8E93",
    fontSize: 13,
  },
});

