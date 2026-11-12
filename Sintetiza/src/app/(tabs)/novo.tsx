import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ChevronRight, Folder, MessageCircle } from "lucide-react-native";
import { router } from "expo-router";
import {
  adicionarTarefa,
  useEspacos,
  type PeriodoPrazo,
  type PrioridadeTarefa,
} from "../../data/tarefasStore";

const PERIODOS: PeriodoPrazo[] = ["Hoje", "Amanhã", "Esta semana"];
const PRIORIDADES: PrioridadeTarefa[] = ["Alta", "Média", "Baixa"];

export default function NovoScreen() {
  const isDark = useColorScheme() === "dark";
  const { espacos } = useEspacos();
  const opcoesEspaco = espacos.map((e) => e.nome);
  const [titulo, setTitulo] = useState("");
  const [espaco, setEspaco] = useState(opcoesEspaco[0] ?? "Trabalho");
  const [prazoGrupo, setPrazoGrupo] = useState<PeriodoPrazo>("Hoje");
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>("Média");
  const [erro, setErro] = useState<string | null>(null);

  const theme = {
    bg: isDark ? "#101b2b" : "#f5f9fe",
    cardBg: isDark ? "#18263b" : "#ffffff",
    cardBorder: isDark ? "#2c3c54" : "#e6edf5",
    highlight: isDark ? "#203c5f" : "#e5f0ff",
    textPrimary: isDark ? "#e6effc" : "#152748",
    textSecondary: isDark ? "#a6b5ca" : "#7b889a",
    accent: isDark ? "#8dc6ff" : "#1d64ed",
    primary: "#1d64ed",
  };

  function handleSalvar() {
    const limpo = titulo.trim();
    if (!limpo) {
      setErro("Informe um título para a tarefa.");
      return;
    }

    const prazoTexto =
      prazoGrupo === "Hoje"
        ? "Hoje"
        : prazoGrupo === "Amanhã"
          ? "Amanhã"
          : "Esta semana";

    adicionarTarefa({
      titulo: limpo,
      espaco,
      prazoTexto,
      prazoGrupo,
      prioridade,
    });

    setTitulo("");
    setErro(null);
    router.navigate("/(tabs)/tarefas");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Nova tarefa
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Crie uma tarefa rápida ou importe uma conversa do WhatsApp.
          </Text>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
            ]}
          >
            <Text style={[styles.label, { color: theme.textPrimary }]}>
              Título
            </Text>
            <TextInput
              value={titulo}
              onChangeText={(text) => {
                setTitulo(text);
                if (erro) setErro(null);
              }}
              placeholder="Ex: Revisar contrato enviado no grupo"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  color: theme.textPrimary,
                  backgroundColor: theme.bg,
                  borderColor: erro ? "#ef5060" : theme.cardBorder,
                },
              ]}
            />
            {erro ? <Text style={styles.errorText}>{erro}</Text> : null}

            <Text style={[styles.label, styles.fieldGap, { color: theme.textPrimary }]}>
              Prazo
            </Text>
            <View style={[styles.segmented, { backgroundColor: theme.highlight }]}>
              {PERIODOS.map((item) => {
                const ativo = prazoGrupo === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setPrazoGrupo(item)}
                    style={[
                      styles.segmentItem,
                      ativo && { backgroundColor: theme.cardBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: ativo ? theme.textPrimary : theme.textSecondary },
                        ativo && styles.segmentTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, styles.fieldGap, { color: theme.textPrimary }]}>
              Prioridade
            </Text>
            <View style={styles.chipRow}>
              {PRIORIDADES.map((item) => {
                const ativo = prioridade === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setPrioridade(item)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: ativo ? theme.primary : theme.bg,
                        borderColor: ativo ? theme.primary : theme.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: ativo ? "#ffffff" : theme.textPrimary },
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, styles.fieldGap, { color: theme.textPrimary }]}>
              Espaço
            </Text>
            <View style={styles.chipRow}>
              {opcoesEspaco.map((item) => {
                const ativo = espaco === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setEspaco(item)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: ativo ? theme.highlight : theme.bg,
                        borderColor: ativo ? theme.accent : theme.cardBorder,
                      },
                    ]}
                  >
                    <Folder
                      size={14}
                      color={ativo ? theme.accent : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: ativo ? theme.accent : theme.textPrimary },
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={handleSalvar}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Check size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>Criar tarefa</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/resumos")}
            style={({ pressed }) => [
              styles.importCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={[styles.importIcon, { backgroundColor: theme.highlight }]}>
              <MessageCircle size={20} color="#28ba60" />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.importTitle, { color: theme.textPrimary }]}>
                Extrair de conversa do WhatsApp
              </Text>
              <Text style={[styles.importSub, { color: theme.textSecondary }]}>
                Envie um arquivo .txt ou .zip para gerar resumos e tarefas
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textSecondary} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  fieldGap: {
    marginTop: 16,
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  errorText: {
    color: "#ef5060",
    fontSize: 12,
    marginTop: 6,
  },
  segmented: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "500",
  },
  segmentTextActive: {
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  submitBtn: {
    marginTop: 22,
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  importCard: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  importIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  importTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  importSub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
});
