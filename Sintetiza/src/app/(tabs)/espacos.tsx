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
import {
  Folder,
  Briefcase,
  GraduationCap,
  Plus,
  Search,
  ChevronRight,
  FileText,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react-native";

const ESPACOS_MOCK = [
  {
    id: "1",
    nome: "Trabalho",
    tipo: "Principal",
    icone: Briefcase,
    tarefas: 5,
    pendencias: 2,
    resumos: 8,
    corIcone: "#1D64ED",
  },
  {
    id: "2",
    nome: "Faculdade",
    tipo: "Acadêmico",
    icone: GraduationCap,
    tarefas: 2,
    pendencias: 1,
    resumos: 4,
    corIcone: "#1D64ED",
  },
  {
    id: "3",
    nome: "Projetos Pessoais",
    tipo: "Projetos",
    icone: Folder,
    tarefas: 1,
    pendencias: 0,
    resumos: 2,
    corIcone: "#1D64ED",
  },
];

const RESUMOS_MOCK = [
  {
    id: "1",
    espaco: "Trabalho",
    titulo: "Princípio da Responsabilidade Única (SRP)",
    tempo: "4 min",
    data: "Hoje",
    trecho:
      "Síntese das decisões sobre microsserviços NestJS e desacoplamento de repositórios.",
  },
  {
    id: "2",
    espaco: "Faculdade",
    titulo: "Clean Architecture no Frontend",
    tempo: "8 min",
    data: "Ontem",
    trecho:
      "Isolamento da camada de apresentação da camada de domínio em React Native.",
  },
  {
    id: "3",
    espaco: "Trabalho",
    titulo: "Alinhamento Técnico - Sprint 12",
    tempo: "2 min",
    data: "18 Set",
    trecho:
      "Definição da estratégia de autenticação JWT e suporte a biometria nativa.",
  },
  {
    id: "4",
    espaco: "Projetos Pessoais",
    titulo: "Ideias de Aplicativos com IA",
    tempo: "5 min",
    data: "15 Set",
    trecho:
      "Brainstorming sobre agentes autônomos e geração automática de sínteses móveis.",
  },
];

export default function EspacosScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [busca, setBusca] = useState("");
  const [espacoFiltro, setEspacoFiltro] = useState("Todos");

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
    chipActiveBg: "#1D64ED",
    chipActiveText: "#FFFFFF",
    chipInactiveBg: isDark ? "#141C2E" : "#FFFFFF",
    chipInactiveText: isDark ? "#94A3B8" : "#64748B",
  };

  const resumosFiltrados = RESUMOS_MOCK.filter((r) => {
    const matchEspaco = espacoFiltro === "Todos" || r.espaco === espacoFiltro;
    const matchBusca =
      busca.trim() === "" ||
      r.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      r.trecho.toLowerCase().includes(busca.toLowerCase()) ||
      r.espaco.toLowerCase().includes(busca.toLowerCase());
    return matchEspaco && matchBusca;
  });

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greetingTitle, { color: theme.textPrimary }]}>
              Seus Espaços 📂
            </Text>
            <Text style={[styles.greetingSubtitle, { color: theme.textSecondary }]}>
              Contextos e resumos organizados por grupos
            </Text>
          </View>
        </View>

        {/* 2. Barra de Busca */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
            },
          ]}
        >
          <Search size={20} color={theme.primary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.primary }]}
            placeholder="Buscar em espaços ou resumos..."
            placeholderTextColor={isDark ? "#60A5FA" : "#2563EB"}
            value={busca}
            onChangeText={setBusca}
          />
        </View>

        {/* 3. Card Destaque: Novo Espaço */}
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.88}
          onPress={() => {}}
        >
          <View style={styles.actionCardLeft}>
            <View style={styles.iconBadge}>
              <Layers size={26} color="#FFFFFF" />
            </View>
            <View style={styles.actionCardTextContainer}>
              <Text style={styles.actionCardTitle}>Criar novo espaço</Text>
              <Text style={styles.actionCardSubtitle}>
                Separe conversas de trabalho, faculdade e projetos
              </Text>
            </View>
          </View>
          <View style={styles.actionCardButton}>
            <Plus size={20} color="#1D64ED" strokeWidth={2.8} />
          </View>
        </TouchableOpacity>

        {/* 4. Resumo de Métricas */}
        <View
          style={[
            styles.overviewCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <View style={styles.overviewItem}>
            <Folder size={20} color={theme.primary} />
            <Text style={[styles.overviewNumber, { color: theme.textPrimary }]}>
              {ESPACOS_MOCK.length}
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>
              Espaços
            </Text>
          </View>

          <View style={[styles.overviewDivider, { backgroundColor: theme.divider }]} />

          <View style={styles.overviewItem}>
            <FileText size={20} color={theme.primary} />
            <Text style={[styles.overviewNumber, { color: theme.textPrimary }]}>
              14
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>
              Resumos
            </Text>
          </View>

          <View style={[styles.overviewDivider, { backgroundColor: theme.divider }]} />

          <View style={styles.overviewItem}>
            <Sparkles size={20} color={theme.primary} />
            <Text style={[styles.overviewNumber, { color: theme.textPrimary }]}>
              8
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>
              Tarefas
            </Text>
          </View>
        </View>

        {/* 5. Lista de Espaços */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Espaços Cadastrados
          </Text>

          {ESPACOS_MOCK.map((espaco) => {
            const IconComponent = espaco.icone;
            return (
              <TouchableOpacity
                key={espaco.id}
                style={[
                  styles.spaceCard,
                  {
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => setEspacoFiltro(espaco.nome)}
              >
                <View style={styles.spaceCardLeft}>
                  <View
                    style={[
                      styles.spaceIconContainer,
                      { backgroundColor: theme.iconCircleBg },
                    ]}
                  >
                    <IconComponent size={20} color={espaco.corIcone} />
                  </View>
                  <View style={styles.spaceTextContainer}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.spaceTitle, { color: theme.textPrimary }]}>
                        {espaco.nome}
                      </Text>
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{espaco.tipo}</Text>
                      </View>
                    </View>
                    <Text style={[styles.spaceSubtitle, { color: theme.textSecondary }]}>
                      {espaco.tarefas} tarefas • {espaco.pendencias} pendências • {espaco.resumos} resumos
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 6. Seção: Resumos Dentro de Espaços */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Resumos das Conversas
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Sínteses e atas geradas pela IA neste contexto
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/resumos")}
              style={styles.seeMoreButton}
            >
              <Text style={styles.seeMoreText}>Ver todos →</Text>
            </TouchableOpacity>
          </View>

          {/* Filtros por Espaço */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {["Todos", "Trabalho", "Faculdade", "Projetos Pessoais"].map((categoria) => {
              const ativo = espacoFiltro === categoria;
              return (
                <TouchableOpacity
                  key={categoria}
                  onPress={() => setEspacoFiltro(categoria)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: ativo
                        ? theme.chipActiveBg
                        : theme.chipInactiveBg,
                      borderColor: ativo ? theme.chipActiveBg : theme.cardBorder,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: ativo
                          ? theme.chipActiveText
                          : theme.chipInactiveText,
                        fontWeight: ativo ? "700" : "500",
                      },
                    ]}
                  >
                    {categoria}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Lista de Cards de Resumo */}
          <View style={styles.resumosList}>
            {resumosFiltrados.map((resumo) => (
              <TouchableOpacity
                key={resumo.id}
                style={[
                  styles.resumoCard,
                  {
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => router.push(`/artigo/${resumo.id}` as any)}
              >
                <View style={styles.resumoHeader}>
                  <View style={styles.resumoBadge}>
                    <Text style={styles.resumoBadgeText}>{resumo.espaco}</Text>
                  </View>
                  <View style={styles.resumoMetaRow}>
                    <Clock size={12} color={theme.textSecondary} style={{ marginRight: 3 }} />
                    <Text style={[styles.resumoMetaText, { color: theme.textSecondary }]}>
                      {resumo.data} • {resumo.tempo}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.resumoTitulo, { color: theme.textPrimary }]}>
                  {resumo.titulo}
                </Text>

                <Text
                  style={[styles.resumoTrecho, { color: theme.textSecondary }]}
                  numberOfLines={2}
                >
                  {resumo.trecho}
                </Text>

                <View style={styles.resumoFooter}>
                  <Text style={styles.resumoLerMais}>Ler síntese completa →</Text>
                </View>
              </TouchableOpacity>
            ))}
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
    marginBottom: 16,
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
    marginBottom: 20,
  },
  actionCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
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
  overviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    marginBottom: 24,
  },
  overviewItem: {
    alignItems: "center",
    flex: 1,
  },
  overviewNumber: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 2,
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  overviewDivider: {
    width: 1,
    height: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 8,
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  spaceTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    marginRight: 8,
  },
  tag: {
    backgroundColor: "rgba(29, 100, 237, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    color: "#1D64ED",
    fontSize: 11,
    fontWeight: "600",
  },
  spaceSubtitle: {
    fontSize: 12.5,
    fontWeight: "400",
  },
  filterContainer: {
    paddingVertical: 4,
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  resumosList: {
    gap: 12,
  },
  resumoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  resumoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  resumoBadge: {
    backgroundColor: "rgba(29, 100, 237, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  resumoBadgeText: {
    color: "#1D64ED",
    fontSize: 11,
    fontWeight: "700",
  },
  resumoMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  resumoMetaText: {
    fontSize: 12,
  },
  resumoTitulo: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  resumoTrecho: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 10,
  },
  resumoFooter: {
    alignItems: "flex-end",
  },
  resumoLerMais: {
    color: "#1D64ED",
    fontSize: 13,
    fontWeight: "600",
  },
});

