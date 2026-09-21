import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function ContaScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [notificacoes, setNotificacoes] = useState(true);
  const [resumosAutomaticos, setResumosAutomaticos] = useState(false);

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
              styles.title,
              { color: isDark ? "#FFFFFF" : "#000000" },
            ]}
          >
            Conta
          </Text>
        </View>

        {/* Card do Perfil */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
          ]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>ES</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text
              style={[
                styles.profileName,
                { color: isDark ? "#FFFFFF" : "#1C1C1E" },
              ]}
            >
              Equipe Sintetiza
            </Text>
            <Text
              style={[
                styles.profileEmail,
                { color: isDark ? "#8E8E93" : "#6E6E73" },
              ]}
            >
              auth-poc@sintetiza.app
            </Text>
          </View>
        </View>

        {/* Seção 1: PREFERÊNCIAS */}
        <Text
          style={[
            styles.sectionTitle,
            { color: isDark ? "#8E8E93" : "#6E6E73" },
          ]}
        >
          PREFERÊNCIAS
        </Text>
        <View
          style={[
            styles.groupedSection,
            { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
          ]}
        >
          <View style={styles.row}>
            <Text
              style={[
                styles.rowLabel,
                { color: isDark ? "#FFFFFF" : "#1C1C1E" },
              ]}
            >
              Notificações
            </Text>
            <Switch
              value={notificacoes}
              onValueChange={setNotificacoes}
              trackColor={{ false: "#767577", true: "#34C759" }}
            />
          </View>
          <View
            style={[
              styles.separator,
              { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" },
            ]}
          />
        </View>

        {/* Seção 2: SOBRE */}
        <Text
          style={[
            styles.sectionTitle,
            { color: isDark ? "#8E8E93" : "#6E6E73" },
          ]}
        >
          SOBRE
        </Text>
        <View
          style={[
            styles.groupedSection,
            { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
          ]}
        >
          <View style={styles.row}>
            <Text
              style={[
                styles.rowLabel,
                { color: isDark ? "#FFFFFF" : "#1C1C1E" },
              ]}
            >
              Versão do App
            </Text>
            <Text
              style={[
                styles.rowValue,
                { color: isDark ? "#8E8E93" : "#8E8E93" },
              ]}
            >
              1.0.0
            </Text>
          </View>
          <View
            style={[
              styles.separator,
              { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" },
            ]}
          />
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text
              style={[
                styles.rowLabel,
                { color: isDark ? "#FFFFFF" : "#1C1C1E" },
              ]}
            >
              Termos & Privacidade
            </Text>
            <Text style={{ color: "#8E8E93", fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Seção 3: SESSÃO */}
        <View
          style={[
            styles.groupedSection,
            { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF", marginTop: 24 },
          ]}
        >
          <TouchableOpacity
            style={[styles.row, { justifyContent: "center" }]}
            activeOpacity={0.7}
            onPress={async () => {
              await signOut();
              router.push("/login");
            }}
          >
            <Text style={styles.logoutText}>Encerrar Sessão</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginLeft: 8,
    marginBottom: 8,
  },
  groupedSection: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 16,
  },
  rowValue: {
    fontSize: 15,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  logoutText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
  },
});

