import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useColorScheme,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { ARTIGOS } from "../../data/artigos";

export default function ArtigoDetalhesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

  const artigo = (id && ARTIGOS[id]) || ARTIGOS["1"];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${artigo.titulo}\n\n${artigo.trecho}\n\nSintetizado pelo app Sintetiza.`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: artigo.categoria,
          headerBackTitle: "Voltar",
          headerTintColor: "#007AFF",
          gestureEnabled: true, // <-- Gesto de arrastar a borda esquerda para voltar ativo nativamente
        }}
      />
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? "#000000" : "#FFFFFF" },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Tag e Metadados */}
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{artigo.categoria}</Text>
            </View>
            <Text
              style={[
                styles.metaText,
                { color: isDark ? "#8E8E93" : "#6E6E73" },
              ]}
            >
              {artigo.data} • {artigo.tempo} de leitura
            </Text>
          </View>

          {/* Título */}
          <Text
            style={[
              styles.title,
              { color: isDark ? "#FFFFFF" : "#000000" },
            ]}
          >
            {artigo.titulo}
          </Text>

          {/* Card de Resumo Executivo */}
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" },
            ]}
          >
            <Text
              style={[
                styles.summaryCardLabel,
                { color: isDark ? "#007AFF" : "#007AFF" },
              ]}
            >
              SÍNTESE PRINCIPAL
            </Text>
            <Text
              style={[
                styles.summaryCardText,
                { color: isDark ? "#E5E5EA" : "#1C1C1E" },
              ]}
            >
              {artigo.trecho}
            </Text>
          </View>

          {/* Conteúdo Completo */}
          <View style={styles.contentBody}>
            {artigo.conteudo.map((paragrafo, index) => (
              <Text
                key={index}
                style={[
                  styles.paragraph,
                  { color: isDark ? "#D1D1D6" : "#3A3A3C" },
                ]}
              >
                {paragrafo}
              </Text>
            ))}
          </View>

          {/* Ações */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.Button}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Text style={styles.ButtonText}>Compartilhar Síntese</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.DeleteButton,
              ]}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.DeleteButtonText,
                ]}
              >
                Deletar
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  badge: {
    backgroundColor: "rgba(0, 122, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "700",
  },
  metaText: {
    fontSize: 13,
    fontWeight: "500",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 20,
  },
  summaryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  summaryCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  summaryCardText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  contentBody: {
    marginBottom: 32,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
  },
  Button: {
    backgroundColor: "#007AFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  ButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  DeleteButton: {
    backgroundColor: "#FF3B30",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  DeleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
