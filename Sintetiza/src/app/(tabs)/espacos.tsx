import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ChevronRight,
  Folder,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react-native";
import {
  type EspacoItem,
  useEspacos,
  useTarefas,
} from "../../data/tarefasStore";

const SUGESTOES_ESPACO = ["Trabalho", "Faculdade", "Pessoal", "Casa", "Finanças"];

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export default function EspacosScreen() {
  const isDark = useColorScheme() === "dark";
  const { tarefas } = useTarefas();
  const { espacos, adicionarEspaco, renomearEspaco, excluirEspaco } =
    useEspacos();

  const [busca, setBusca] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [espacoEditando, setEspacoEditando] = useState<EspacoItem | null>(null);
  const [nomeInput, setNomeInput] = useState("");
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [espacoExcluindo, setEspacoExcluindo] = useState<EspacoItem | null>(
    null
  );

  const theme = {
    bg: isDark ? "#101b2b" : "#f5f9fe",
    cardBg: isDark ? "#18263b" : "#ffffff",
    cardBorder: isDark ? "#2c3c54" : "#e6edf5",
    highlight: isDark ? "#203c5f" : "#edf5fc",
    textPrimary: isDark ? "#e6effc" : "#152748",
    textSecondary: isDark ? "#a6b5ca" : "#7b889a",
    primary: "#087cfa",
    accent: isDark ? "#60a5fa" : "#246baf",
    actionBorder: isDark ? "#2c3c54" : "#cbdce9",
    danger: "#ef5060",
    overlay: "rgba(10, 17, 29, 0.65)",
  };

  const contagensPorEspaco = useMemo(() => {
    const mapa = new Map<string, { pendentes: number; concluidas: number }>();

    for (const tarefa of tarefas) {
      const chave = tarefa.espaco || "Sem espaço";
      const atual = mapa.get(chave) ?? { pendentes: 0, concluidas: 0 };
      if (tarefa.concluida) {
        atual.concluidas += 1;
      } else {
        atual.pendentes += 1;
      }
      mapa.set(chave, atual);
    }

    return mapa;
  }, [tarefas]);

  const espacosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return espacos;
    return espacos.filter((item) => item.nome.toLowerCase().includes(termo));
  }, [espacos, busca]);

  const semEspacoContagem = contagensPorEspaco.get("Sem espaço") ?? {
    pendentes: 0,
    concluidas: 0,
  };
  const mostrarSemEspaco =
    semEspacoContagem.pendentes + semEspacoContagem.concluidas > 0 &&
    (!busca.trim() || "sem espaço".includes(busca.trim().toLowerCase()));

  const totalResultados =
    espacosFiltrados.length + (mostrarSemEspaco ? 1 : 0);

  function abrirNovoEspaco() {
    setEspacoEditando(null);
    setNomeInput("");
    setErroForm(null);
    setFormAberto(true);
  }

  function abrirRenomear(espaco: EspacoItem) {
    setEspacoEditando(espaco);
    setNomeInput(espaco.nome);
    setErroForm(null);
    setFormAberto(true);
  }

  function fecharForm() {
    setFormAberto(false);
    setEspacoEditando(null);
    setErroForm(null);
  }

  function handleSalvarForm() {
    const erro = espacoEditando
      ? renomearEspaco(espacoEditando.id, nomeInput)
      : adicionarEspaco(nomeInput);

    if (erro) {
      setErroForm(erro);
      return;
    }

    fecharForm();
  }

  function handleConfirmarExclusao() {
    if (!espacoExcluindo) return;
    excluirEspaco(espacoExcluindo.id);
    setEspacoExcluindo(null);
  }

  const tarefasDoEspacoExcluindo = useMemo(() => {
    if (!espacoExcluindo) return 0;
    const c = contagensPorEspaco.get(espacoExcluindo.nome);
    return (c?.pendentes ?? 0) + (c?.concluidas ?? 0);
  }, [espacoExcluindo, contagensPorEspaco]);

  const renderSpaceCard = (
    key: string,
    nome: string,
    espacoObj?: EspacoItem
  ) => {
    const counts = contagensPorEspaco.get(nome) ?? {
      pendentes: 0,
      concluidas: 0,
    };

    return (
      <View
        key={key}
        style={[
          styles.spaceCard,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
          },
        ]}
      >
        <Pressable
          onPress={() => router.navigate("/(tabs)/tarefas")}
          style={({ pressed }) => [
            styles.spaceOpenRow,
            { opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <View
            style={[styles.spaceIconCircle, { backgroundColor: theme.highlight }]}
          >
            <Folder size={20} color={theme.accent} />
          </View>

          <View style={styles.spaceInfo}>
            <Text
              numberOfLines={1}
              style={[styles.spaceTitle, { color: theme.textPrimary }]}
            >
              {nome}
            </Text>
            <Text style={[styles.spaceCounts, { color: theme.textSecondary }]}>
              {plural(counts.pendentes, "pendente", "pendentes")} ·{" "}
              {plural(counts.concluidas, "concluída", "concluídas")}
            </Text>
          </View>

          <ChevronRight size={18} color={theme.textSecondary} />
        </Pressable>

        {espacoObj ? (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => abrirRenomear(espacoObj)}
              style={({ pressed }) => [
                styles.actionPill,
                {
                  borderColor: theme.actionBorder,
                  backgroundColor: theme.bg,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Pencil size={14} color={theme.accent} />
              <Text style={[styles.actionPillText, { color: theme.accent }]}>
                Renomear
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setEspacoExcluindo(espacoObj)}
              style={({ pressed }) => [
                styles.actionPill,
                {
                  borderColor: theme.actionBorder,
                  backgroundColor: theme.bg,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Trash2 size={14} color={theme.danger} />
              <Text style={[styles.actionPillText, { color: theme.danger }]}>
                Excluir
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.bg }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, { color: theme.textPrimary }]}>
          Espaços
        </Text>

        <Text style={[styles.intro, { color: theme.textSecondary }]}>
          Agrupe as tarefas por categoria, como Trabalho, Faculdade ou Pessoal.
        </Text>

        <Pressable
          onPress={abrirNovoEspaco}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: theme.primary, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Text style={styles.primaryBtnText}>Novo espaço</Text>
        </Pressable>

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <Search size={18} color={theme.textSecondary} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar espaços"
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.textPrimary }]}
          />
          {busca.length > 0 ? (
            <Pressable onPress={() => setBusca("")} hitSlop={8}>
              <X size={17} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {busca.trim().length > 0 ? (
          <Text style={[styles.searchCount, { color: theme.textSecondary }]}>
            {totalResultados}{" "}
            {totalResultados === 1
              ? "espaço encontrado"
              : "espaços encontrados"}
          </Text>
        ) : null}

        {totalResultados === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {busca.trim().length > 0
                ? "Nenhum espaço encontrado. Tente outro termo."
                : "Nenhum espaço ainda. Crie o primeiro para organizar suas tarefas."}
            </Text>
          </View>
        ) : (
          <View style={styles.spaceList}>
            {espacosFiltrados.map((item) =>
              renderSpaceCard(item.id, item.nome, item)
            )}
            {mostrarSemEspaco
              ? renderSpaceCard("sem-espaco", "Sem espaço")
              : null}
          </View>
        )}
      </ScrollView>

      {/* Modal: Criar ou Renomear Espaço */}
      <Modal
        visible={formAberto}
        transparent
        animationType="fade"
        onRequestClose={fecharForm}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {espacoEditando ? "Renomear espaço" : "Novo espaço"}
            </Text>

            <TextInput
              value={nomeInput}
              onChangeText={(text) => {
                setNomeInput(text);
                if (erroForm) setErroForm(null);
              }}
              placeholder="Nome do espaço"
              placeholderTextColor={theme.textSecondary}
              autoFocus
              style={[
                styles.modalInput,
                {
                  color: theme.textPrimary,
                  backgroundColor: theme.bg,
                  borderColor: erroForm ? theme.danger : theme.cardBorder,
                },
              ]}
            />

            {erroForm ? (
              <Text style={[styles.modalError, { color: theme.danger }]}>
                {erroForm}
              </Text>
            ) : null}

            {!espacoEditando ? (
              <View style={styles.suggestionsRow}>
                {SUGESTOES_ESPACO.map((sug) => (
                  <Pressable
                    key={sug}
                    onPress={() => {
                      setNomeInput(sug);
                      if (erroForm) setErroForm(null);
                    }}
                    style={[
                      styles.suggestionChip,
                      {
                        backgroundColor: theme.bg,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.suggestionText,
                        { color: theme.textPrimary },
                      ]}
                    >
                      {sug}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={handleSalvarForm}
                style={({ pressed }) => [
                  styles.modalPrimaryBtn,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Text style={styles.modalPrimaryText}>
                  {espacoEditando ? "Salvar" : "Criar espaço"}
                </Text>
              </Pressable>

              <Pressable
                onPress={fecharForm}
                style={[
                  styles.modalSecondaryBtn,
                  { borderColor: theme.cardBorder },
                ]}
              >
                <Text
                  style={[
                    styles.modalSecondaryText,
                    { color: theme.textPrimary },
                  ]}
                >
                  Cancelar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Confirmar Exclusão */}
      <Modal
        visible={Boolean(espacoExcluindo)}
        transparent
        animationType="fade"
        onRequestClose={() => setEspacoExcluindo(null)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Excluir este espaço?
            </Text>
            <Text style={[styles.deleteName, { color: theme.textPrimary }]}>
              {espacoExcluindo?.nome}
            </Text>
            <Text style={[styles.deleteNote, { color: theme.textSecondary }]}>
              {tarefasDoEspacoExcluindo > 0
                ? `${plural(tarefasDoEspacoExcluindo, "tarefa continua salva", "tarefas continuam salvas")}, sem espaço.`
                : "O espaço não tem tarefas."}
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={handleConfirmarExclusao}
                style={({ pressed }) => [
                  styles.modalPrimaryBtn,
                  { backgroundColor: theme.danger, opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Text style={styles.modalPrimaryText}>Excluir espaço</Text>
              </Pressable>

              <Pressable
                onPress={() => setEspacoExcluindo(null)}
                style={[
                  styles.modalSecondaryBtn,
                  { borderColor: theme.cardBorder },
                ]}
              >
                <Text
                  style={[
                    styles.modalSecondaryText,
                    { color: theme.textPrimary },
                  ]}
                >
                  Cancelar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  intro: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 18,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  searchBox: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchCount: {
    fontSize: 12,
    marginTop: -6,
    marginBottom: 12,
  },
  spaceList: {
    gap: 10,
  },
  spaceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  spaceOpenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  spaceIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  spaceInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  spaceTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  spaceCounts: {
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingLeft: 54,
    marginTop: 12,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyWrap: {
    paddingTop: 28,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  modalInput: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  modalError: {
    marginTop: 8,
    fontSize: 12.5,
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  suggestionChip: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
  },
  suggestionText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  modalActions: {
    marginTop: 18,
    gap: 8,
  },
  modalPrimaryBtn: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  modalSecondaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  deleteName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  deleteNote: {
    fontSize: 13.5,
    lineHeight: 20,
  },
});
