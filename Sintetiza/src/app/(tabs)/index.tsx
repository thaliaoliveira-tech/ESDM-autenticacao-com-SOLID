import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { ArrowUpFromLine } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function InicioScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <SafeAreaView
      edges={["top"]}
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? "#000000" : "#F2F2F7" },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text
            style={[
              styles.greeting,
              { color: isDark ? "#8E8E93" : "#6E6E73" },
            ]}
          >
            BEM-VINDO AO
          </Text>
          <Text
            style={[
              styles.title,
              { color: isDark ? "#FFFFFF" : "#000000" },
            ]}
          >
            Sintetiza
          </Text>
        </View>

        {/* Card Destaque / Ação Rápida */}
        <View
          style={[
            styles.featureCard,
            { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
          ]}
        >
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>IA NATIVA</Text>
          </View>
          <Text
            style={[
              styles.featureTitle,
              { color: isDark ? "#FFFFFF" : "#1C1C1E" },
            ]}
          >
            Criar Novo Resumo
          </Text>
          <Text
            style={[
              styles.featureSubtitle,
              { color: isDark ? "#8E8E93" : "#6E6E73" },
            ]}
          >
            Importe aqui sua conversa do whatsapp, e a IA irá gerar um resumo completo, destacando os pontos mais importantes da conversa.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Importar</Text>
            <ArrowUpFromLine color="#FFFFFF" size={16} />
          </TouchableOpacity>
        </View>

        {/* Seção de Atividades Recentes */}
        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? "#FFFFFF" : "#000000" },
            ]}
          >
            Recentes
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
          ]}
          activeOpacity={0.7}
          onPress={() => router.push("/artigo/1")}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: isDark ? "#FFFFFF" : "#1C1C1E" },
            ]}
          >
            Princípio da Responsabilidade Única (SRP)
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: isDark ? "#8E8E93" : "#6E6E73" },
            ]}
          >
            Princípios de design aplicados ao desenvolvimento de microsserviços modernos com NestJS.
          </Text>
          <View style={styles.cardFooter}>
            <Text
              style={[
                styles.cardMeta,
                { color: isDark ? "#636366" : "#8E8E93" },
              ]}
            >
              Hoje • 4 min de leitura
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
          ]}
          activeOpacity={0.7}
          onPress={() => router.push("/artigo/2")}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: isDark ? "#FFFFFF" : "#1C1C1E" },
            ]}
          >
            Clean Architecture no Frontend
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: isDark ? "#8E8E93" : "#6E6E73" },
            ]}
          >
            Isolamento da camada de apresentação da camada de domínio com React Native.
          </Text>
          <View style={styles.cardFooter}>
            <Text
              style={[
                styles.cardMeta,
                { color: isDark ? "#636366" : "#8E8E93" },
              ]}
            >
              Ontem • 8 min de leitura
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  featureCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 28,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  badgeContainer: {
    backgroundColor: "rgba(0, 122, 255, 0.12)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  badgeText: {
    color: "#007AFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  featureSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: "500",
  },
});

