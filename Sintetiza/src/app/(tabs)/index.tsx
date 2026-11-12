import { type ComponentRef, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  BookOpen,
  FileText,
  HelpCircle,
  MessageSquare,
  Plus,
  Send,
  Upload,
} from "lucide-react-native";
import {
  Pressable,
  SafeAreaView,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
  useColorScheme,
} from "react-native";

export default function ConversasScreen() {
  const isDark = useColorScheme() === "dark";
  const [mensagem, setMensagem] = useState("");
  const [mensagensEnviadas, setMensagensEnviadas] = useState<string[]>([]);
  const [sidebarVisivel, setSidebarVisivel] = useState(false);
  const sidebarTranslateX = useRef(new Animated.Value(380)).current;

  const abrirSidebar = () => {
    setSidebarVisivel(true);
    sidebarTranslateX.setValue(380);
    requestAnimationFrame(() => {
      Animated.spring(sidebarTranslateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
      }).start();
    });
  };

  const fecharSidebar = () => {
    Animated.timing(sidebarTranslateX, {
      toValue: 380,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setSidebarVisivel(false);
    });
  };
  const chatScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const enviarMensagem = () => {
    const texto = mensagem.trim();
    if (!texto) return;

    setMensagensEnviadas((mensagens) => [...mensagens, texto]);
    setMensagem("");
  };

  useEffect(() => {
    const keyboardSubscription = Keyboard.addListener("keyboardDidShow", () => {
      requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd({ animated: true }));
    });

    return () => keyboardSubscription.remove();
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd({ animated: true }));
  }, [mensagensEnviadas]);

  const theme = {
    bg: isDark ? "#0D1A2B" : "#F8FAFC",
    panel: isDark ? "#192A41" : "#FFFFFF",
    border: isDark ? "#2D4664" : "#DCE7F4",
    text: isDark ? "#F5F9FF" : "#10213A",
    muted: isDark ? "#AFC5E2" : "#63748C",
    blue: "#1683F8",
    icon: "#92C9FF",
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Conversas</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={[styles.statusText, { color: theme.muted }]}>
                Assistente de conversas
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="Importar conversa" hitSlop={8}>
              <Upload size={21} color={theme.icon} />
            </Pressable>
            <Pressable
              accessibilityLabel="Abrir resumos"
              hitSlop={8}
              onPress={abrirSidebar}
            >
              <BookOpen size={21} color={theme.icon} />
            </Pressable>
          </View>
        </View>

        <Modal
          visible={sidebarVisivel}
          transparent
          animationType="none"
          onRequestClose={fecharSidebar}
        >
          <View style={styles.sidebarOverlay}>
            <Pressable
              style={styles.sidebarBackdrop}
              onPress={fecharSidebar}
              accessibilityLabel="Fechar histórico"
            />
            <Animated.View
              style={[
                styles.sidebar,
                { backgroundColor: theme.panel },
                { transform: [{ translateX: sidebarTranslateX }] },
              ]}
            >
              <View style={styles.sidebarHeader}>
                <Text style={[styles.sidebarTitle, { color: theme.text }]}>
                  Conversas
                </Text>
                <Pressable
                  onPress={fecharSidebar}
                  accessibilityLabel="Fechar"
                  style={styles.sidebarClose}
                >
                  <Text style={[styles.sidebarCloseText, { color: theme.muted }]}>×</Text>
                </Pressable>
              </View>

              <Pressable
                style={[styles.newConversationButton, { backgroundColor: theme.blue }]}
                onPress={() => {
                  setMensagensEnviadas([]);
                  setMensagem("");
                  fecharSidebar();
                }}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.newConversationText}>Nova conversa</Text>
              </Pressable>

              <Text style={[styles.sidebarSectionLabel, { color: theme.muted }]}>
                RECENTES
              </Text>
              {["Conversa sobre tarefas", "Planejamento da semana", "Notas da faculdade"].map(
                (conversa) => (
                  <Pressable
                    key={conversa}
                    style={[styles.conversationItem, { borderBottomColor: theme.border }]}
                    onPress={fecharSidebar}
                  >
                    <MessageSquare size={17} color={theme.icon} />
                    <Text
                      numberOfLines={1}
                      style={[styles.conversationItemText, { color: theme.text }]}
                    >
                      {conversa}
                    </Text>
                  </Pressable>
                )
              )}
            </Animated.View>
          </View>
        </Modal>

        <ScrollView
          ref={chatScrollRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.importVisual}>
            <View style={styles.whatsappCircle}>
              <MessageSquare size={34} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <Text style={[styles.arrow, { color: theme.icon }]}>→</Text>
            <View style={[styles.fileIconBox, { backgroundColor: "#23456F" }]}>
              <FileText size={38} color={theme.icon} />
            </View>
            <Text style={[styles.extraLabel, { color: theme.icon }]}>RECURSO EXTRA</Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            Da conversa para a lista de tarefas
          </Text>
          <Text style={[styles.description, { color: theme.muted }]}>
            Importe uma conversa para encontrar o que precisa{"\n"}
            ser feito. A IA resume o texto e sugere tarefas para{"\n"}
            você revisar e criar.
          </Text>

          <Pressable
            style={[styles.uploadButton, { backgroundColor: theme.blue }]}
            accessibilityRole="button"
          >
            <Upload size={18} color="#FFFFFF" />
            <Text style={styles.uploadButtonText}>Selecionar arquivo</Text>
          </Pressable>

          <Text style={[styles.dropHint, { color: theme.muted }]}>
            ou arraste o arquivo para cá
          </Text>
          <Text style={[styles.fileHint, { color: theme.muted }]}>
            Arquivo .txt exportado do WhatsApp · até 10 MB
          </Text>

          <View style={styles.helpRow}>
            <Pressable style={styles.helpAction}>
              <HelpCircle size={15} color={theme.text} />
              <Text style={[styles.helpText, { color: theme.text }]}>Como exportar</Text>
            </Pressable>
            <Pressable style={styles.helpAction}>
              <FileText size={15} color={theme.text} />
              <Text style={[styles.helpText, { color: theme.text }]}>Usar um exemplo</Text>
            </Pressable>
          </View>

          <View style={styles.aiMessageRow}>
            <View style={[styles.aiAvatar, { backgroundColor: theme.blue }]}>
              <Bot size={18} color="#FFFFFF" />
              <View style={styles.aiAvatarStatus} />
            </View>
            <View style={[styles.aiMessage, { backgroundColor: theme.panel, borderColor: theme.border }]}>
              <Text style={[styles.aiMessageText, { color: theme.text }]}>
                <Text style={styles.aiMessageHeading}>Não entendi 🤔</Text>
                {"\n"}Sua mensagem ("asd") parece ter sido enviada por engano. Me diga o que você precisa e eu ajudo.
                {"\n"}<Text style={styles.aiMessageBold}>O que posso fazer por você:</Text>
                {"\n"}{"\n"}•  <Text style={styles.aiMessageBold}>Analisar uma conversa do WhatsApp:</Text> importe um arquivo <Text style={styles.aiCode}>.txt</Text> exportado pelo WhatsApp usando o botão de upload. A partir dele, eu identifico as tarefas acionáveis (com responsável e prazo) e proponho o registro delas.
                {"\n"}{"\n"}•  <Text style={styles.aiMessageBold}>Organizar suas tarefas:</Text> criar, editar, concluir, reabrir ou excluir tarefas, agrupadas por espaço (ex.: Faculdade, Trabalho, Pessoal).
                {"\n"}{"\n"}•  <Text style={styles.aiMessageBold}>Consultar o que já está salvo:</Text> hoje você tem 2 tarefas registradas, sendo 1 pendente (prazo 2026-11-11) e 1 concluída no espaço Faculdade.
                {"\n"}Quer começar importando uma conversa ou ver suas tarefas em detalhe?
              </Text>
              <Text style={[styles.aiMessageTime, { color: theme.muted }]}>22:09</Text>
            </View>
          </View>

          {mensagensEnviadas.map((texto, index) => (
            <View key={`${index}-${texto}`}>
              <View style={[styles.userMessage, { backgroundColor: theme.blue }]}>
                <Text style={styles.userMessageText}>{texto}</Text>
                <Text style={styles.userMessageTime}>Agora</Text>
              </View>
              <View style={styles.aiMessageRow}>
                <View style={[styles.aiAvatar, { backgroundColor: theme.blue }]}>
                  <Bot size={18} color="#FFFFFF" />
                  <View style={styles.aiAvatarStatus} />
                </View>
                <View
                  style={[
                    styles.aiMessage,
                    { backgroundColor: theme.panel, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.aiMessageText, { color: theme.text }]}>
                    <Text style={styles.aiMessageHeading}>Entendi!</Text>
                    {"\n"}Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Praesent commodo cursus magna, vel scelerisque nisl consectetur.
                    {"\n\n"}Vestibulum id ligula porta felis euismod semper. Integer
                    posuere erat a ante venenatis dapibus posuere velit aliquet.
                  </Text>
                  <Text style={[styles.aiMessageTime, { color: theme.muted }]}>Agora</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.composer, { borderTopColor: theme.border, backgroundColor: theme.bg }]}>
          <View style={[styles.inputWrap, { backgroundColor: theme.panel, borderColor: theme.border }]}>
            <TextInput
              value={mensagem}
              onChangeText={setMensagem}
              placeholder="Faça uma pergunta..."
              placeholderTextColor={theme.muted}
              style={[styles.input, { color: theme.text }]}
              returnKeyType="send"
              onSubmitEditing={enviarMensagem}
            />
          </View>
          <Pressable
            style={[
              styles.sendButton,
              { backgroundColor: mensagem.trim() ? theme.blue : theme.muted },
            ]}
            accessibilityLabel="Enviar"
            accessibilityRole="button"
            disabled={!mensagem.trim()}
            onPress={enviarMensagem}
          >
            {mensagem.trim() ? (
              <Send size={20} color="#FFFFFF" />
            ) : (
              <ArrowUp size={23} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  header: {
    minHeight: 70,
    paddingHorizontal: 17,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1BA567" },
  statusText: { fontSize: 11 },
  headerActions: { flexDirection: "row", gap: 28, paddingTop: 5, paddingRight: 6 },
  sidebarOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sidebarBackdrop: { flex: 1 },
  sidebar: {
    width: "82%",
    maxWidth: 330,
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 24,
    elevation: 12,
    shadowColor: "#000000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  sidebarTitle: { fontSize: 20, fontWeight: "700" },
  sidebarClose: { padding: 4 },
  sidebarCloseText: { fontSize: 28, lineHeight: 25, fontWeight: "300" },
  newConversationButton: {
    height: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  newConversationText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  sidebarSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 26,
    marginBottom: 8,
  },
  conversationItem: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  conversationItemText: { flex: 1, fontSize: 14 },
  content: { flex: 1 },
  contentContainer: { alignItems: "center", paddingHorizontal: 17, paddingBottom: 24 },
  importVisual: {
    height: 143,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 13,
  },
  whatsappCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#24C168",
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: { fontSize: 30, fontWeight: "300" },
  fileIconBox: {
    width: 54,
    height: 70,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  extraLabel: {
    position: "absolute",
    bottom: 8,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  title: { fontSize: 19, fontWeight: "700", textAlign: "center", marginTop: 9 },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 14,
  },
  uploadButton: {
    width: "100%",
    height: 53,
    borderRadius: 11,
    marginTop: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  uploadButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  dropHint: { fontSize: 12, marginTop: 8 },
  fileHint: { fontSize: 11, marginTop: 3 },
  helpRow: { flexDirection: "row", gap: 24, marginTop: 18 },
  helpAction: { flexDirection: "row", alignItems: "center", gap: 7 },
  helpText: { fontSize: 12, fontWeight: "700" },
  aiMessageRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 37,
  },
  aiAvatar: {
    width: 23,
    height: 23,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
  },
  aiAvatarStatus: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  aiMessage: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 11,
  },
  aiMessageText: { fontSize: 14, lineHeight: 20 },
  aiMessageHeading: { color: "#73B9FF", fontWeight: "700" },
  aiMessageBold: { fontWeight: "700" },
  aiCode: {
    backgroundColor: "#DCE8F5",
    color: "#183452",
    fontWeight: "600",
    paddingHorizontal: 3,
  },
  aiMessageTime: { fontSize: 10, alignSelf: "flex-end", marginTop: 4 },
  userMessage: {
    alignSelf: "flex-end",
    maxWidth: "82%",
    borderRadius: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 8,
  },
  userMessageText: { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  userMessageTime: {
    color: "#DCEEFF",
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 3,
  },
  composer: {
    minHeight: 80,
    paddingHorizontal: 13,
    paddingTop: 11,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    height: 43,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
  },
  input: { paddingHorizontal: 16, fontSize: 14 },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
