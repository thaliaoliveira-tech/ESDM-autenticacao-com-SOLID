import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, Check, Folder, Search, X } from "lucide-react-native";
import {
  type PeriodoFiltro,
  type PrioridadeTarefa,
  type StatusFiltro,
  type TarefaItem,
  useTarefas,
} from "../../data/tarefasStore";

const PERIODOS: PeriodoFiltro[] = ["Hoje", "Amanhã", "Esta semana", "Todas"];
const STATUS_OPCOES: StatusFiltro[] = ["Pendentes", "Concluídas", "Todas"];

export default function TarefasScreen() {
  const isDark = useColorScheme() === "dark";
  const { tarefas, toggleConcluida } = useTarefas();
  const [periodoAtivo, setPeriodoAtivo] = useState<PeriodoFiltro>("Hoje");
  const [statusAtivo, setStatusAtivo] = useState<StatusFiltro>("Pendentes");
  const [busca, setBusca] = useState("");

  const theme = {
    bg: isDark ? "#101b2b" : "#f5f9fe",
    cardBg: isDark ? "#18263b" : "#ffffff",
    cardBorder: isDark ? "#2c3c54" : "#e6edf5",
    highlight: isDark ? "#203c5f" : "#e5f0ff",
    textPrimary: isDark ? "#e6effc" : "#152748",
    textSecondary: isDark ? "#a6b5ca" : "#7b889a",
    accent: isDark ? "#60a5fa" : "#1d64ed",
    primary: "#1d64ed",
    inputBorder: isDark ? "#2c3c54" : "#cbdce9",
    checkboxBorder: isDark ? "#3b5272" : "#cbdce9",
    success: "#16805b",
  };

  const tarefasDoPeriodo = useMemo(() => {
    if (periodoAtivo === "Todas") return tarefas;
    return tarefas.filter((item) => item.prazoGrupo === periodoAtivo);
  }, [tarefas, periodoAtivo]);

  const totalParaFazer = useMemo(
    () => tarefasDoPeriodo.filter((item) => !item.concluida).length,
    [tarefasDoPeriodo]
  );

  const totalConcluidas = useMemo(
    () => tarefasDoPeriodo.filter((item) => item.concluida).length,
    [tarefasDoPeriodo]
  );

  const tarefasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return tarefasDoPeriodo.filter((item) => {
      if (termo) {
        const matchTitulo = item.titulo.toLowerCase().includes(termo);
        const matchEspaco = item.espaco.toLowerCase().includes(termo);
        if (!matchTitulo && !matchEspaco) return false;
      }

      if (statusAtivo === "Pendentes") return !item.concluida;
      if (statusAtivo === "Concluídas") return item.concluida;
      return true;
    });
  }, [tarefasDoPeriodo, statusAtivo, busca]);

  const getPrioridadeColor = (prioridade: PrioridadeTarefa) => {
    if (prioridade === "Alta") return "#ef5060";
    if (prioridade === "Média") return "#f6cd3c";
    return "#087cfa";
  };

  const getEmptyMessage = () => {
    if (busca.trim().length > 0) {
      return "Nenhuma tarefa encontrada neste filtro. Tente outro termo.";
    }
    if (periodoAtivo === "Hoje") {
      return "Nenhuma tarefa para hoje neste filtro.";
    }
    if (periodoAtivo === "Amanhã") {
      return "Nenhuma tarefa para amanhã neste filtro.";
    }
    if (periodoAtivo === "Esta semana") {
      return "Nenhuma tarefa para esta semana neste filtro.";
    }
    return "Nenhuma tarefa neste filtro.";
  };

  const statusContagem = (status: StatusFiltro) => {
    if (status === "Pendentes") return totalParaFazer;
    if (status === "Concluídas") return totalConcluidas;
    return tarefasDoPeriodo.length;
  };

  const mostrarControlesLista =
    tarefasDoPeriodo.length > 0 || busca.trim().length > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <Text style={[styles.heading, { color: theme.textPrimary }]}>Tarefas</Text>
        <Text style={[styles.headingSubtitle, { color: theme.textSecondary }]}>
          O que você precisa fazer hoje?
        </Text>

        {/* Cards de resumo lado a lado */}
        <View style={styles.overviewRow}>
          <View
            style={[
              styles.overviewCard,
              { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
            ]}
          >
            <Text style={[styles.overviewNumber, { color: theme.accent }]}>
              {totalParaFazer}
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>
              para fazer
            </Text>
          </View>

          <View
            style={[
              styles.overviewCard,
              { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
            ]}
          >
            <Text style={[styles.overviewNumber, { color: theme.accent }]}>
              {totalConcluidas}
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>
              concluídas
            </Text>
          </View>
        </View>

        {/* Barra segmentada de períodos */}
        <View style={[styles.segmentedTrack, { backgroundColor: theme.highlight }]}>
          {PERIODOS.map((periodo) => {
            const ativo = periodoAtivo === periodo;
            return (
              <Pressable
                key={periodo}
                onPress={() => setPeriodoAtivo(periodo)}
                style={[
                  styles.segmentButton,
                  periodo === "Esta semana" && styles.segmentButtonWide,
                  ativo && { backgroundColor: theme.cardBg },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.segmentText,
                    { color: ativo ? theme.textPrimary : theme.textSecondary },
                    ativo && styles.segmentTextActive,
                  ]}
                >
                  {periodo}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Busca e filtros de status quando há tarefas no período */}
        {mostrarControlesLista ? (
          <>
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.inputBorder,
                },
              ]}
            >
              <Search size={17} color={theme.textSecondary} />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar tarefas"
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.textPrimary }]}
              />
              {busca.length > 0 ? (
                <Pressable onPress={() => setBusca("")} hitSlop={8}>
                  <X size={17} color={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.filterRow}>
              {STATUS_OPCOES.map((status) => {
                const ativo = statusAtivo === status;
                return (
                  <Pressable
                    key={status}
                    onPress={() => setStatusAtivo(status)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: ativo ? theme.primary : theme.cardBg,
                        borderColor: ativo ? theme.primary : theme.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: ativo ? "#ffffff" : theme.textPrimary },
                      ]}
                    >
                      {status}{" "}
                      <Text
                        style={{
                          color: ativo ? "#d1e9ff" : theme.textSecondary,
                        }}
                      >
                        {statusContagem(status)}
                      </Text>
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {/* Lista de tarefas ou estado vazio */}
        {tarefasFiltradas.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {getEmptyMessage()}
            </Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {tarefasFiltradas.map((item: TarefaItem) => (
              <View
                key={item.id}
                style={[
                  styles.taskCard,
                  {
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <Pressable
                  onPress={() => toggleConcluida(item.id)}
                  style={styles.taskMainPressable}
                >
                  <View
                    style={[
                      styles.priorityDot,
                      { backgroundColor: getPrioridadeColor(item.prioridade) },
                    ]}
                  />
                  <View style={styles.taskContent}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.taskTitle,
                        { color: item.concluida ? theme.textSecondary : theme.textPrimary },
                        item.concluida && styles.taskTitleDone,
                      ]}
                    >
                      {item.titulo}
                    </Text>
                    <View style={styles.taskMetaRow}>
                      <Calendar size={12} color={theme.textSecondary} />
                      <Text
                        numberOfLines={1}
                        style={[styles.taskMetaText, { color: theme.textSecondary }]}
                      >
                        {item.prazoTexto}
                      </Text>
                    </View>
                    <View style={styles.taskMetaRow}>
                      <Folder size={12} color={theme.textSecondary} />
                      <Text
                        numberOfLines={1}
                        style={[styles.taskMetaText, { color: theme.textSecondary }]}
                      >
                        {item.espaco}
                      </Text>
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => toggleConcluida(item.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.concluida }}
                  style={styles.taskToggleBtn}
                >
                  <View
                    style={[
                      styles.taskCheckbox,
                      {
                        borderColor: item.concluida
                          ? theme.success
                          : theme.checkboxBorder,
                        backgroundColor: item.concluida
                          ? theme.success
                          : "transparent",
                      },
                    ]}
                  >
                    {item.concluida ? (
                      <Check size={12} color="#ffffff" strokeWidth={2.5} />
                    ) : null}
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 120,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headingSubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 18,
  },
  overviewRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  overviewCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
  },
  overviewNumber: {
    fontSize: 27,
    fontWeight: "700",
    lineHeight: 30,
  },
  overviewLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  segmentedTrack: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 4,
    gap: 2,
    marginBottom: 20,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  segmentButtonWide: {
    flex: 1.35,
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  segmentTextActive: {
    fontWeight: "700",
  },
  searchBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyWrap: {
    paddingTop: 18,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  taskList: {
    gap: 8,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 76,
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 4,
  },
  taskMainPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 5,
  },
  taskContent: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: 1,
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
  },
  taskMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  taskMetaText: {
    fontSize: 11.5,
    lineHeight: 15,
  },
  taskToggleBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  taskCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
