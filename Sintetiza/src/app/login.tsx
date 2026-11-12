import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft, Mail, Lock, Eye, EyeOff } from "lucide-react-native";
import { SintetizaLogo } from "../components/SintetizaLogo";
import { SocialAuthButtons } from "../components/SocialAuthButtons";
import { useAuth } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const navigation = useNavigation<any>();
  const { signIn, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Ao entrar na tela de login, zera o caminho da stack e define 'welcome' como raiz
  useEffect(() => {
    const state = navigation.getState();
    if (!state) return;

    const routes = state.routes;
    const isAlreadyWelcomeRoot =
      routes.length === 2 &&
      routes[0]?.name === "welcome" &&
      routes[1]?.name === "login";

    if (!isAlreadyWelcomeRoot) {
      navigation.reset({
        index: 1,
        routes: [{ name: "welcome" }, { name: "login" }],
      });
    }
  }, [navigation]);

  const handleLogin = async () => {
    await signIn(email, senha);
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Formas orgânicas decorativas sutis de fundo */}
      <Svg
        height={height}
        width={width}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Circle
          cx={width * 0.95}
          cy={height * 0.08}
          r={width * 0.4}
          fill="#EFF6FF"
        />
        <Circle
          cx={width * 0.05}
          cy={height * 0.95}
          r={width * 0.45}
          fill="#F0F7FF"
        />
      </Svg>

      <SafeAreaView style={styles.safeArea}>
        {/* Barra superior: Botão Voltar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={26} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo + Cabeçalho */}
            <View style={styles.header}>
              <SintetizaLogo
                size={64}
                variant="colored"
                showTitle={true}
                titleSize={28}
                titleColor="#0F172A"
              />
              <Text style={styles.title}>Bem-vindo de volta!</Text>
              <Text style={styles.subtitle}>Faça login para continuar.</Text>
            </View>

            {/* Formulário */}
            <View style={styles.form}>
              {/* Campo E-mail */}
              <View style={styles.inputContainer}>
                <Mail size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Endereço de e-mail"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Campo Senha */}
              <View style={styles.inputContainer}>
                <Lock size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Senha"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={senha}
                  onChangeText={setSenha}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  style={styles.eyeButton}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#94A3B8" />
                  ) : (
                    <Eye size={20} color="#94A3B8" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Link Esqueceu a senha */}
              <TouchableOpacity
                style={styles.forgotPassword}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
              </TouchableOpacity>

              {/* Botão Entrar */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isLoading && { opacity: 0.7 },
                ]}
                activeOpacity={0.85}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <Text style={styles.submitButtonText}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divisor e Botões Sociais */}
            <SocialAuthButtons
              dividerText="Ou entre com"
              onGooglePress={handleLogin}
              onFacebookPress={handleLogin}
            />

            {/* Link para Cadastro */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Não tem uma conta? </Text>
              <TouchableOpacity
                onPress={() => router.push("/register")}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLink}>Cadastre-se</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 26,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 14,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "400",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: "#0F172A",
  },
  eyeButton: {
    padding: 6,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 18,
  },
  forgotPasswordText: {
    color: "#1D64ED",
    fontSize: 13,
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: "#1D64ED",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1D64ED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    paddingBottom: 10,
  },
  footerText: {
    fontSize: 14,
    color: "#64748B",
  },
  footerLink: {
    fontSize: 14,
    color: "#1D64ED",
    fontWeight: "700",
  },
});
