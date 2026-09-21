import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { StatusBar } from "expo-status-bar";
import { SintetizaLogo } from "../components/SintetizaLogo";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Formas orgânicas decorativas de fundo */}
      <Svg
        height={height}
        width={width}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {/* Curva no canto superior direito */}
        <Circle
          cx={width * 0.9}
          cy={height * 0.12}
          r={width * 0.45}
          fill="rgba(255, 255, 255, 0.08)"
        />
        {/* Curva no canto inferior esquerdo */}
        <Circle
          cx={width * 0.15}
          cy={height * 0.88}
          r={width * 0.55}
          fill="rgba(255, 255, 255, 0.09)"
        />
      </Svg>

      <SafeAreaView style={styles.safeArea}>
        {/* Centro: Logo + Texto */}
        <View style={styles.content}>
          <SintetizaLogo
            size={80}
            variant="white"
            showTitle={true}
            titleSize={36}
            titleColor="#FFFFFF"
          />
          <Text style={styles.subtitle}>
            Suas conversas, organizadas{"\n"}em um só lugar.
          </Text>
        </View>

        {/* Rodapé: Botões de Ação */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.primaryButtonText}>Entrar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.secondaryButtonText}>Criar conta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestButton}
            activeOpacity={0.7}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.guestButtonText}>Continue como convidado</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1D64ED",
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 14,
    maxWidth: 260,
    fontWeight: "400",
  },
  actions: {
    width: "100%",
    paddingBottom: 24,
    gap: 14,
  },
  primaryButton: {
    backgroundColor: "#FFFFFF",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#1D64ED",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  guestButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 10,
  },
  guestButtonText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    fontWeight: "500",
  },
});
