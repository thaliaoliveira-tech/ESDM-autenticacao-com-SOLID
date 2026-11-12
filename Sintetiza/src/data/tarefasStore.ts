import { useEffect, useState } from "react";

export type PeriodoPrazo = "Hoje" | "Amanhã" | "Esta semana";
export type PeriodoFiltro = PeriodoPrazo | "Todas";
export type StatusFiltro = "Pendentes" | "Concluídas" | "Todas";
export type PrioridadeTarefa = "Alta" | "Média" | "Baixa";

export interface TarefaItem {
  id: string;
  titulo: string;
  espaco: string;
  prazoTexto: string;
  prazoGrupo: PeriodoPrazo;
  prioridade: PrioridadeTarefa;
  concluida: boolean;
}

export interface EspacoItem {
  id: string;
  nome: string;
}

const ESPACOS_INICIAIS: EspacoItem[] = [
  { id: "esp-1", nome: "Trabalho" },
  { id: "esp-2", nome: "Faculdade" },
  { id: "esp-3", nome: "Casa" },
  { id: "esp-4", nome: "Finanças" },
];

const TAREFAS_INICIAIS: TarefaItem[] = [
  {
    id: "1",
    titulo: "Validar minuta da reunião do projeto Sintetiza",
    espaco: "Trabalho",
    prazoTexto: "Amanhã, 14:00",
    prazoGrupo: "Amanhã",
    prioridade: "Alta",
    concluida: false,
  },
  {
    id: "2",
    titulo: "Confirmar orçamento da reforma com fornecedor",
    espaco: "Casa",
    prazoTexto: "Amanhã, 17:30",
    prazoGrupo: "Amanhã",
    prioridade: "Média",
    concluida: false,
  },
  {
    id: "3",
    titulo: "Consolidar backlog de entregas da sprint",
    espaco: "Trabalho",
    prazoTexto: "Sexta-feira, 10:00",
    prazoGrupo: "Esta semana",
    prioridade: "Média",
    concluida: false,
  },
  {
    id: "4",
    titulo: "Organizar planilha de custos de infraestrutura",
    espaco: "Finanças",
    prazoTexto: "Sábado, 09:00",
    prazoGrupo: "Esta semana",
    prioridade: "Baixa",
    concluida: false,
  },
  {
    id: "5",
    titulo: "Separar comprovantes para prestação de contas",
    espaco: "Finanças",
    prazoTexto: "Ontem",
    prazoGrupo: "Esta semana",
    prioridade: "Baixa",
    concluida: true,
  },
];

let tarefasState: TarefaItem[] = TAREFAS_INICIAIS;
let espacosState: EspacoItem[] = ESPACOS_INICIAIS;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Alterna o estado de conclusão de uma tarefa pelo id.
 */
export function toggleTarefaConcluida(id: string) {
  tarefasState = tarefasState.map((item) =>
    item.id === id ? { ...item, concluida: !item.concluida } : item
  );
  notifyListeners();
}

/**
 * Adiciona uma nova tarefa ao topo da lista compartilhada.
 */
export function adicionarTarefa(nova: Omit<TarefaItem, "id" | "concluida">) {
  const item: TarefaItem = {
    ...nova,
    id: String(Date.now()),
    concluida: false,
  };
  tarefasState = [item, ...tarefasState];
  notifyListeners();
}

/**
 * Cria um novo espaço caso ainda não exista um com o mesmo nome.
 */
export function adicionarEspaco(nome: string): string | null {
  const limpo = nome.trim();
  if (!limpo) return "Informe o nome do espaço.";
  const existe = espacosState.some(
    (e) => e.nome.toLowerCase() === limpo.toLowerCase()
  );
  if (existe) return "Já existe um espaço com esse nome.";

  espacosState = [
    ...espacosState,
    { id: `esp-${Date.now()}`, nome: limpo },
  ];
  notifyListeners();
  return null;
}

/**
 * Renomeia um espaço e atualiza as tarefas vinculadas a ele.
 */
export function renomearEspaco(id: string, novoNome: string): string | null {
  const limpo = novoNome.trim();
  if (!limpo) return "Informe o nome do espaço.";
  const atual = espacosState.find((e) => e.id === id);
  if (!atual) return "Espaço não encontrado.";
  const existe = espacosState.some(
    (e) => e.id !== id && e.nome.toLowerCase() === limpo.toLowerCase()
  );
  if (existe) return "Já existe um espaço com esse nome.";

  espacosState = espacosState.map((e) =>
    e.id === id ? { ...e, nome: limpo } : e
  );
  tarefasState = tarefasState.map((t) =>
    t.espaco === atual.nome ? { ...t, espaco: limpo } : t
  );
  notifyListeners();
  return null;
}

/**
 * Exclui um espaço e mantém suas tarefas desvinculadas ("Sem espaço").
 */
export function excluirEspaco(id: string) {
  const atual = espacosState.find((e) => e.id === id);
  if (!atual) return;
  espacosState = espacosState.filter((e) => e.id !== id);
  tarefasState = tarefasState.map((t) =>
    t.espaco === atual.nome ? { ...t, espaco: "Sem espaço" } : t
  );
  notifyListeners();
}

/**
 * Hook reativo para ler e atualizar as tarefas em qualquer tela.
 */
export function useTarefas() {
  const [tarefas, setTarefas] = useState<TarefaItem[]>(tarefasState);

  useEffect(() => {
    const sync = () => setTarefas(tarefasState);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return {
    tarefas,
    toggleConcluida: toggleTarefaConcluida,
    adicionarTarefa,
  };
}

/**
 * Hook reativo para ler e gerenciar os espaços em qualquer tela.
 */
export function useEspacos() {
  const [espacos, setEspacos] = useState<EspacoItem[]>(espacosState);

  useEffect(() => {
    const sync = () => setEspacos(espacosState);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return {
    espacos,
    adicionarEspaco,
    renomearEspaco,
    excluirEspaco,
  };
}
