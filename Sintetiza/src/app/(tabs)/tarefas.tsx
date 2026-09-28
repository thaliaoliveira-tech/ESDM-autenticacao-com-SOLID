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
  CircleCheck,
  TriangleAlert,
  Search,
  Briefcase,
  GraduationCap,
  Calendar,
  Check,
  Sparkles,
  Plus,
  Folder,
} from "lucide-react-native";

interface TarefaItem {
  id: string;
  titulo: string;
  prazoTexto: string;
  prazoGrupo: "Hoje" | "Amanhã" | "Próximas";
  espaco: string;
  icone: any;
  corStatus: string;
  concluida: boolean;
}

const TAREFAS_INICIAIS: TarefaItem[] = [
  {
    id: "1",
    titulo: "Enviar dados cadastrais do projeto",
    prazoTexto: "Hoje",
    prazoGrupo: "Hoje",
    espaco: "Trabalho",
    icone: Briefcase,
    corStatus: "#EF4444",
    concluida: false,
  },
  {
    id: "2",
    titulo: "Confirmar presença na reunião da Sprint",
    prazoTexto: "Hoje",
    prazoGrupo: "Hoje",
    espaco: "Trabalho",
    icone: Briefcase,
    corStatus: "#EF4444",
    concluida: false,
  },
  {
    id: "3",
    titulo: "Entregar trabalho de ESDM no portal",
    prazoTexto: "Amanhã",
    prazoGrupo: "Amanhã",
    espaco: "Faculdade",
    icone: GraduationCap,
    corStatus: "#F59E0B",
    concluida: false,
  },
  {
    id: "4",
    titulo: "Revisar anotações da aula de SOLID",
    prazoTexto: "Amanhã",
    prazoGrupo: "Amanhã",
    espaco: "Faculdade",
    icone: GraduationCap,
    corStatus: "#F59E0B",
    concluida: false,
  },
  {
    id: "5",
    titulo: "Estudar instalação do ambiente Docker",
    prazoTexto: "25/09",
    prazoGrupo: "Próximas",
    espaco: "Trabalho",
    icone: Briefcase,
    corStatus: "#10B981",
    concluida: false,
  },
  {
    id: "6",
    titulo: "Preparar apresentação dos slides de ESDM",
    prazoTexto: "28/09",
    prazoGrupo: "Próximas",
    espaco: "Faculdade",
    icone: GraduationCap,
    corStatus: "#10B981",
    concluida: true,
  },
  {
    id: "7",
    titulo: "Configurar banco de dados SQLite local",
    prazoTexto: "29/09",
    prazoGrupo: "Próximas",
    espaco: "Trabalho",
    icone: Briefcase,
    corStatus: "#10B981",
    concluida: true,
  },
];

export default function TarefasScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [tarefas, setTarefas] = useState<TarefaItem[]>(TAREFAS_INICIAIS);
  const [busca, setBusca] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"Todas" | "Hoje" | "Amanhã" | "Próximas">("Todas");

  const theme = {
    bg: isDark ? "#090D16" : "#F8FAFC",
    cardBg: isDark ? "#141C2E" : "#FFFFFF",
    cardBorder: isDark ? "#1E293B" : "#F1F5F9",
    textPrimary: isDark ? "#F8FAFC" : "#0F172A",
    textSecondary: isDark ? "#94A3B8" : "#64748B",
    primary: "#1D64ED",
    inputBg: isDark ? "#0F172A" : "#EFF6FF",
    inputBorder: isDark ? "#1E3A8A" : "#DBEAFE",
    divider: isDark ? "#1E293B" : "#F1F5F9",
    chipActiveBg: "#1D64ED",
    chipActiveText: "#FFFFFF",
    chipInactiveBg: isDark ? "#141C2E" : "#FFFFFF",
    chipInactiveText: isDark ? "#94A3B8" : "#64748B",
  };

  const toggleConcluida = (id: string) => {
    setTarefas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, concluida: !t.concluida } : t))
    );
  };

  const totalPendentes = tarefas.filter((t) => !t.concluida).length;
  const totalConcluidas = tarefas.filter((t) => t.concluida).length;

  const tarefasFiltradas = tarefas.filter((item) => {
    const matchAba = abaAtiva === "Todas" || item.prazoGrupo === abaAtiva;
    const matchBusca =
      busca.trim() === "" ||
      item.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      item.espaco.toLowerCase().includes(busca.toLowerCase());
    return matchAba && matchBusca;
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
              Tarefas
            </Text>
            <Text style={[styles.greetingSubtitle, { color: theme.textSecondary }]}>
              Ações extraídas diretamente das suas conversas
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
            placeholder="Buscar tarefas ou pendências..."
            placeholderTextColor={isDark ? "#60A5FA" : "#2563EB"}
            value={busca}
            onChangeText={setBusca}
          />
        </View>

        {/* 3. Card Destaque: Ação IA */}
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.88}
          onPress={() => router.push("/(tabs)")}
        >
          <View style={styles.actionCardLeft}>
            <View style={styles.iconBadge}>
              <Sparkles size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionCardTextContainer}>
              <Text style={styles.actionCardTitle}>Extrair mais tarefas</Text>
              <Text style={styles.actionCardSubtitle}>
                Importe uma conversa para a IA mapear novos prazos
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
            <Calendar size={20} color={theme.primary} />
            <Text style={[styles.overviewNumber, { color: theme.textPrimary }]}>
              {tarefas.length}
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>
              Total
            </Text>
          </View>

          <View style={[styles.overviewDivider, { backgroundColor: theme.divider }]} />

          <View style={styles.overviewItem}>
            <TriangleAlert size={20} color="#F59E0B" />
            <Text style={[styles.overviewNumber, { color: "#F59E0B" }]}>
              {totalPendentes}
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>
              Pendentes
            </Text>
          </View>

          <View style={[styles.overviewDivider, { backgroundColor: theme.divider }]} />

          <View style={styles.overviewItem}>
            <CircleCheck size={20} color="#10B981" />
            <Text style={[styles.overviewNumber, { color: "#10B981" }]}>
              {totalConcluidas}
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>
              Concluídas
            </Text>
          </View>
        </View>

        {/* 5. Filtros por Prazo */}
        <View style={styles.filterRow}>
          {(["Todas", "Hoje", "Amanhã", "Próximas"] as const).map((aba) => {
            const ativo = abaAtiva === aba;
            return (
              <TouchableOpacity
                key={aba}
                onPress={() => setAbaAtiva(aba)}
                style={[
                  styles.filterChip,
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
                    styles.filterChipText,
                    {
                      color: ativo
                        ? theme.chipActiveText
                        : theme.chipInactiveText,
                      fontWeight: ativo ? "700" : "500",
                    },
                  ]}
                >
                  {aba}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 6. Lista de Tarefas Agrupadas */}
        <View style={styles.section}>
          <View
            style={[
              styles.tasksCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            {tarefasFiltradas.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Nenhuma tarefa encontrada para este filtro.
                </Text>
              </View>
            ) : (
              tarefasFiltradas.map((tarefa, index) => {
                const IconEspaco = tarefa.icone;
                const isLast = index === tarefasFiltradas.length - 1;

                return (
                  <React.Fragment key={tarefa.id}>
                    <View style={styles.taskItem}>
                      {/* Checkbox interativo */}
                      <TouchableOpacity
                        onPress={() => toggleConcluida(tarefa.id)}
                        activeOpacity={0.7}
                        style={[
                          styles.checkbox,
                          tarefa.concluida && styles.checkboxConcluido,
                          !tarefa.concluida && { borderColor: tarefa.corStatus },
                        ]}
                      >
                        {tarefa.concluida && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                      </TouchableOpacity>

                      {/* Informações da Tarefa */}
                      <TouchableOpacity
                        style={styles.taskContent}
                        activeOpacity={0.7}
                        onPress={() => toggleConcluida(tarefa.id)}
                      >
                        <Text
                          style={[
                            styles.taskTitle,
                            { color: theme.textPrimary },
                            tarefa.concluida && styles.taskTitleConcluida,
                          ]}
                        >
                          {tarefa.titulo} —{" "}
                          <Text style={styles.taskDueDate}>{tarefa.prazoTexto}</Text>
                        </Text>

                        <View style={styles.taskMeta}>
                          <IconEspaco
                            size={13}
                            color={theme.textSecondary}
                            style={styles.taskMetaIcon}
                          />
                          <Text style={[styles.taskMetaText, { color: theme.textSecondary }]}>
                            {tarefa.espaco}
                          </Text>
                          {tarefa.concluida && (
                            <View style={styles.concluidaBadge}>
                              <Text style={styles.concluidaBadgeText}>Concluída</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>

                    {!isLast && (
                      <View
                        style={[styles.taskDivider, { backgroundColor: theme.divider }]}
                      />
                    )}
                  </React.Fragment>
                );
              })
            )}
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
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
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
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    marginTop: 2,
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxConcluido: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  taskTitleConcluida: {
    textDecorationLine: "line-through",
    opacity: 0.5,
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
  concluidaBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 8,
  },
  concluidaBadgeText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "700",
  },
  taskDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 36,
  },
  emptyContainer: {
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
});

