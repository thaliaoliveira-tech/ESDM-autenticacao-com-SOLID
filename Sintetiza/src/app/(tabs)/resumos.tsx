import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CATEGORIAS = ["Todos", "Artigos", "Livros", "Reuniões"];

const RESUMOS_EXEMPLO = [
  {
    id: "1",
    titulo: "Princípio da Responsabilidade Única (SRP)",
    categoria: "Artigos",
    tempo: "4 min",
    data: "21 Set",
    trecho:
      "Uma classe deve ter um, e apenas um, motivo para mudar. Como desacoplar regras de negócio de persistência.",
  },
  {
    id: "2",
    titulo: "Clean Architecture no Frontend",
    categoria: "Livros",
    tempo: "8 min",
    data: "20 Set",
    trecho:
      "Isolamento da camada de apresentação da camada de domínio, permitindo testes unitários e reutilização de regras.",
  },
  {
    id: "3",
    titulo: "Alinhamento Técnico - Sprint 12",
    categoria: "Reuniões",
    tempo: "2 min",
    data: "18 Set",
    trecho:
      "Definição da estratégia de autenticação JWT com Refresh Tokens e suporte a Biometria nativa.",
  },
  {
    id: "4",
    titulo: "Inversão de Dependência com NestJS",
    categoria: "Artigos",
    tempo: "6 min",
    data: "15 Set",
    trecho:
      "Uso de Interfaces e Tokens customizados de injeção para desacoplar implementações de repositórios.",
  },
];

export default function ResumosScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");
  const [busca, setBusca] = useState("");

  const resumosFiltrados = RESUMOS_EXEMPLO.filter((item) => {
    const matchCategoria =
      categoriaAtiva === "Todos" || item.categoria === categoriaAtiva;
    const matchBusca =
      busca.trim() === "" ||
      item.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      item.trecho.toLowerCase().includes(busca.toLowerCase());
    return matchCategoria && matchBusca;
  });

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
            Resumos
          </Text>
        </View>

        {/* Barra de Busca estilo iOS */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: isDark ? "#1C1C1E" : "#E3E3E8" },
          ]}
        >
          <TextInput
            placeholder="Buscar nos resumos..."
            placeholderTextColor={isDark ? "#8E8E93" : "#6E6E73"}
            value={busca}
            onChangeText={setBusca}
            style={[
              styles.searchInput,
              { color: isDark ? "#FFFFFF" : "#000000" },
            ]}
          />
        </View>

        {/* Filtro por Categorias */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIAS.map((cat) => {
            const isSelected = categoriaAtiva === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategoriaAtiva(cat)}
                style={[
                  styles.categoryChip,
                  isSelected
                    ? styles.categoryChipActive
                    : {
                        backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
                      },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected
                      ? styles.categoryChipTextActive
                      : { color: isDark ? "#8E8E93" : "#6E6E73" },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lista de Resumos */}
        {resumosFiltrados.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.resumoCard,
              { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.resumoTop}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>{item.categoria}</Text>
              </View>
              <Text
                style={[
                  styles.resumoMeta,
                  { color: isDark ? "#636366" : "#8E8E93" },
                ]}
              >
                {item.data} • {item.tempo}
              </Text>
            </View>
            <Text
              style={[
                styles.resumoTitle,
                { color: isDark ? "#FFFFFF" : "#1C1C1E" },
              ]}
            >
              {item.titulo}
            </Text>
            <Text
              style={[
                styles.resumoTrecho,
                { color: isDark ? "#8E8E93" : "#6E6E73" },
              ]}
              numberOfLines={2}
            >
              {item.trecho}
            </Text>
          </TouchableOpacity>
        ))}
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
    marginBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  searchBar: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    fontSize: 16,
    padding: 0,
  },
  categoriesContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  categoryChipActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  resumoCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  resumoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tagBadge: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    color: "#007AFF",
    fontSize: 11,
    fontWeight: "700",
  },
  resumoMeta: {
    fontSize: 12,
    fontWeight: "500",
  },
  resumoTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  resumoTrecho: {
    fontSize: 14,
    lineHeight: 20,
  },
});

