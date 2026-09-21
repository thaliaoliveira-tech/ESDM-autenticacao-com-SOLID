import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import {
  Bell,
  Sparkles,
  Search,
  Plus,
  Folder,
  CircleCheck,
  TriangleAlert,
  Briefcase,
  GraduationCap,
  ChevronRight,
} from "lucide-react-native";

// Ícone vetorial do WhatsApp estilizado
function WhatsAppIcon({ size = 28, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.952 3.71 1.454 5.711 1.455h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z"
        fill={color}
      />
    </Svg>
  );
}

export default function InicioScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [searchQuery, setSearchQuery] = useState("");

  const theme = {
    bg: isDark ? "#090D16" : "#F8FAFC",
    cardBg: isDark ? "#141C2E" : "#FFFFFF",
    cardBorder: isDark ? "#1E293B" : "#F1F5F9",
    textPrimary: isDark ? "#F8FAFC" : "#0F172A",
    textSecondary: isDark ? "#94A3B8" : "#64748B",
    primary: "#1D64ED",
    inputBg: isDark ? "#0F172A" : "#EFF6FF",
    inputBorder: isDark ? "#1E3A8A" : "#DBEAFE",
    iconCircleBg: isDark ? "#1E293B" : "#EFF6FF",
    divider: isDark ? "#1E293B" : "#F1F5F9",
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header: Saudação & Notificações */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greetingTitle, { color: theme.textPrimary }]}>
              Olá, Cliente 👋
            </Text>
            <Text style={[styles.greetingSubtitle, { color: theme.textSecondary }]}>
              O que vamos sintetizar?
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Bell size={24} color={theme.primary} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* 2. Barra de Busca / Pergunte ao Sintetiza */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
            },
          ]}
        >
          <Sparkles size={20} color={theme.primary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.primary }]}
            placeholder="Pergunte ao Sintetiza..."
            placeholderTextColor={"#2563EB"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity activeOpacity={0.7}>
            <Search size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* 3. Banner Destaque: Nova conversa (WhatsApp) */}
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.88}
          onPress={() => {}}
        >
          <View style={styles.actionCardLeft}>
            <View style={styles.whatsAppIconContainer}>
              <WhatsAppIcon size={30} color="#FFFFFF" />
            </View>
            <View style={styles.actionCardTextContainer}>
              <Text style={styles.actionCardTitle}>Nova conversa</Text>
              <Text style={styles.actionCardSubtitle}>
                Importe uma conversa{"\n"}do WhatsApp
              </Text>
            </View>
          </View>
          <View style={styles.actionCardButton}>
            <Plus size={20} color="#1D64ED" strokeWidth={2.8} />
          </View>
        </TouchableOpacity>

        {/* 4. Seção: Visão geral */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Visão geral</Text>
          <View
            style={[
              styles.overviewCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            {/* Coluna 1: Espaços */}
            <View style={styles.overviewItem}>
              <Folder size={22} color={theme.primary} />
              <Text style={[styles.overviewNumber, { color: theme.textPrimary }]}>4</Text>
              <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>Espaços</Text>
            </View>

            <View style={[styles.overviewDivider, { backgroundColor: theme.divider }]} />

            {/* Coluna 2: Tarefas */}
            <View style={styles.overviewItem}>
              <CircleCheck size={22} color={theme.primary} />
              <Text style={[styles.overviewNumber, { color: theme.textPrimary }]}>8</Text>
              <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>Tarefas</Text>
            </View>

            <View style={[styles.overviewDivider, { backgroundColor: theme.divider }]} />

            {/* Coluna 3: Pendências */}
            <View style={styles.overviewItem}>
              <TriangleAlert size={22} color={theme.primary} />
              <Text style={[styles.overviewNumber, { color: theme.textPrimary }]}>3</Text>
              <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>Pendências</Text>
            </View>
          </View>
        </View>

        {/* 5. Seção: Seus espaços */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Seus espaços</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/resumos")}
              style={styles.seeMoreButton}
            >
              <Text style={styles.seeMoreText}>Ver →</Text>
            </TouchableOpacity>
          </View>

          {/* Espaço 1: Trabalho */}
          <TouchableOpacity
            style={[
              styles.spaceCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => router.push("/artigo/1")}
          >
            <View style={styles.spaceCardLeft}>
              <View
                style={[
                  styles.spaceIconContainer,
                  { backgroundColor: theme.iconCircleBg },
                ]}
              >
                <Briefcase size={20} color={theme.primary} />
              </View>
              <View style={styles.spaceTextContainer}>
                <Text style={[styles.spaceTitle, { color: theme.textPrimary }]}>Trabalho</Text>
                <Text style={[styles.spaceSubtitle, { color: theme.textSecondary }]}>
                  5 tarefas • 2 pendências
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>

          {/* Espaço 2: Faculdade */}
          <TouchableOpacity
            style={[
              styles.spaceCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => router.push("/artigo/2")}
          >
            <View style={styles.spaceCardLeft}>
              <View
                style={[
                  styles.spaceIconContainer,
                  { backgroundColor: theme.iconCircleBg },
                ]}
              >
                <GraduationCap size={20} color={theme.primary} />
              </View>
              <View style={styles.spaceTextContainer}>
                <Text style={[styles.spaceTitle, { color: theme.textPrimary }]}>Faculdade</Text>
                <Text style={[styles.spaceSubtitle, { color: theme.textSecondary }]}>
                  2 tarefas • 1 pendência
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* 6. Seção: Próximas tarefas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Próximas tarefas</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {}}
              style={styles.seeMoreButton}
            >
              <Text style={styles.seeMoreText}>Ver →</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.tasksCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            {/* Tarefa 1 */}
            <TouchableOpacity
              style={styles.taskItem}
              activeOpacity={0.7}
              onPress={() => router.push("/artigo/1")}
            >
              <View style={[styles.taskDot, { backgroundColor: "#EF4444" }]} />
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, { color: theme.textPrimary }]}>
                  Enviar dados — <Text style={styles.taskDueDate}>Hoje</Text>
                </Text>
                <View style={styles.taskMeta}>
                  <Briefcase size={13} color={theme.textSecondary} style={styles.taskMetaIcon} />
                  <Text style={[styles.taskMetaText, { color: theme.textSecondary }]}>Trabalho</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={[styles.taskDivider, { backgroundColor: theme.divider }]} />

            {/* Tarefa 2 */}
            <TouchableOpacity
              style={styles.taskItem}
              activeOpacity={0.7}
              onPress={() => router.push("/artigo/2")}
            >
              <View style={[styles.taskDot, { backgroundColor: "#F59E0B" }]} />
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, { color: theme.textPrimary }]}>
                  Entregar trabalho — <Text style={styles.taskDueDate}>Amanhã</Text>
                </Text>
                <View style={styles.taskMeta}>
                  <GraduationCap size={13} color={theme.textSecondary} style={styles.taskMetaIcon} />
                  <Text style={[styles.taskMetaText, { color: theme.textSecondary }]}>Faculdade</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={[styles.taskDivider, { backgroundColor: theme.divider }]} />

            {/* Tarefa 3 */}
            <TouchableOpacity
              style={styles.taskItem}
              activeOpacity={0.7}
              onPress={() => router.push("/artigo/1")}
            >
              <View style={[styles.taskDot, { backgroundColor: "#10B981" }]} />
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, { color: theme.textPrimary }]}>
                  Estudar instalação — <Text style={styles.taskDueDate}>25/09</Text>
                </Text>
                <View style={styles.taskMeta}>
                  <Briefcase size={13} color={theme.textSecondary} style={styles.taskMetaIcon} />
                  <Text style={[styles.taskMetaText, { color: theme.textSecondary }]}>Trabalho</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
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
    paddingTop: 12,
    paddingBottom: 44,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  greetingSubtitle: {
    fontSize: 15,
    marginTop: 4,
    fontWeight: "400",
  },
  notificationButton: {
    position: "relative",
    padding: 6,
    marginTop: 2,
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1D64ED",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 0,
  },
  actionCard: {
    backgroundColor: "#1D64ED",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#1D64ED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  actionCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  whatsAppIconContainer: {
    marginRight: 14,
  },
  actionCardTextContainer: {
    flex: 1,
  },
  actionCardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
  },
  actionCardSubtitle: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "400",
  },
  actionCardButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  seeMoreButton: {
    paddingVertical: 4,
    paddingLeft: 8,
  },
  seeMoreText: {
    color: "#1D64ED",
    fontSize: 14,
    fontWeight: "600",
  },
  overviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    marginTop: 12,
  },
  overviewItem: {
    alignItems: "center",
    flex: 1,
  },
  overviewNumber: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 2,
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  overviewDivider: {
    width: 1,
    height: 36,
  },
  spaceCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  spaceCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  spaceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  spaceTextContainer: {
    flex: 1,
  },
  spaceTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  spaceSubtitle: {
    fontSize: 13,
    fontWeight: "400",
  },
  tasksCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
  },
  taskDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  taskDueDate: {
    color: "#1D64ED",
    fontWeight: "600",
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskMetaIcon: {
    marginRight: 5,
  },
  taskMetaText: {
    fontSize: 12.5,
    fontWeight: "400",
  },
  taskDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 24,
  },
});
