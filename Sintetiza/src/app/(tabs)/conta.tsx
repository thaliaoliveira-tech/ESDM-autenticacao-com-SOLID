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
  const theme = {
    bg: isDark ? "#0D1A2B" : "#F8FAFC",
    panel: isDark ? "#192A41" : "#FFFFFF",
    border: isDark ? "#2D4664" : "#DCE7F4",
    text: isDark ? "#F5F9FF" : "#10213A",
    muted: isDark ? "#AFC5E2" : "#63748C",
    blue: "#1683F8",
    danger: "#FF6675",
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={[
        styles.safeArea,
        { backgroundColor: theme.bg },
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
              { color: theme.text },
            ]}
          >
            Conta
          </Text>
        </View>

        {/* Card do Perfil */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme.panel, borderColor: theme.border },
          ]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>ES</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text
              style={[
                styles.profileName,
                { color: theme.text },
              ]}
            >
              Equipe Sintetiza
            </Text>
            <Text
              style={[
                styles.profileEmail,
                { color: theme.muted },
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
            { color: theme.muted },
          ]}
        >
          PREFERÊNCIAS
        </Text>
        <View
          style={[
            styles.groupedSection,
            { backgroundColor: theme.panel, borderColor: theme.border },
          ]}
        >
          <View style={styles.row}>
            <Text
              style={[
                styles.rowLabel,
                { color: theme.text },
              ]}
            >
              Notificações
            </Text>
            <Switch
              value={notificacoes}
              onValueChange={setNotificacoes}
              trackColor={{ false: theme.border, true: theme.blue }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View
            style={[
              styles.separator,
              { backgroundColor: theme.border },
            ]}
          />
        </View>

        {/* Seção 2: SOBRE */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.muted },
          ]}
        >
          SOBRE
        </Text>
        <View
          style={[
            styles.groupedSection,
            { backgroundColor: theme.panel, borderColor: theme.border },
          ]}
        >
          <View style={styles.row}>
            <Text
              style={[
                styles.rowLabel,
                { color: theme.text },
              ]}
            >
              Versão do App
            </Text>
            <Text
              style={[
                styles.rowValue,
                { color: theme.muted },
              ]}
            >
              1.0.0
            </Text>
          </View>
          <View
            style={[
              styles.separator,
              { backgroundColor: theme.border },
            ]}
          />
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text
              style={[
                styles.rowLabel,
                { color: theme.text },
              ]}
            >
              Termos & Privacidade
            </Text>
            <Text style={{ color: theme.muted, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Seção 3: SESSÃO */}
        <View
          style={[
            styles.groupedSection,
            { backgroundColor: theme.panel, borderColor: theme.border, marginTop: 24 },
          ]}
        >
          <TouchableOpacity
            style={[styles.row, { justifyContent: "center" }]}
            activeOpacity={0.7}
            onPress={async () => {
              await signOut();
              router.replace("/login");
            }}
          >
            <Text style={[styles.logoutText, { color: theme.danger }]}>Encerrar Sessão</Text>
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
    paddingTop: 22,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 28,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1683F8",
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
    borderWidth: 1,
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
    fontSize: 16,
    fontWeight: "600",
  },
});
