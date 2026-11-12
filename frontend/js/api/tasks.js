import { request, listAll } from './client.js';
import { localToday } from '../utils/helpers.js';

// Etiquetas por cor, como no Trello: urgente (vermelho), pouco urgente (amarelo), não urgente (azul). Opcional.
export const PRIORITIES = { high: 'Urgente', medium: 'Pouco urgente', low: 'Não urgente' };

const blankToNull = value => {
  const text = String(value ?? '').trim();
  return text ? text : null;
};

/**
 * Converte os valores do formulário em TaskInput: campos vazios viram null
 * (a API limpa o campo) e o espaço vai como `spaceId` ou `spaceName`, nunca os dois.
 */
export function toTaskInput(values) {
  const input = {};
  if ('title' in values) input.title = String(values.title ?? '').trim();
  for (const field of ['description', 'assignee', 'dueOn', 'priority']) {
    if (field in values) input[field] = blankToNull(values[field]);
  }
  if (values.spaceName !== undefined) input.spaceName = blankToNull(values.spaceName);
  else if ('spaceId' in values) input.spaceId = blankToNull(values.spaceId);
  return input;
}

/** GET /tasks com período, situação, espaço, busca e ordenação; `meta.counts` traz os contadores. */
export function listTasks({ period = 'all', status = 'all', spaceId, q, sort = 'created' } = {}) {
  return listAll('/tasks', { period, status, spaceId, q: q?.trim() || undefined, sort, today: localToday() });
}

export const taskSummary = () => request('/tasks/summary', { query: { today: localToday() } });
export const getTask = id => request(`/tasks/${encodeURIComponent(id)}`);
export const createTask = values => request('/tasks', { method: 'POST', body: toTaskInput(values) });
export const updateTask = (id, values) => request(`/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: toTaskInput(values) });
export const deleteTask = id => request(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const completeTask = (id, completedOn = localToday()) => request(`/tasks/${encodeURIComponent(id)}/complete`, { method: 'POST', body: { completedOn } });
export const reopenTask = id => request(`/tasks/${encodeURIComponent(id)}/reopen`, { method: 'POST' });
export const setTaskDone = (id, done) => done ? completeTask(id) : reopenTask(id);
