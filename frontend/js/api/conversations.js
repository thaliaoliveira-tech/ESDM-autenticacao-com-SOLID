import { request, listAll } from './client.js';
import { AppError } from '../utils/helpers.js';

const MAX_BYTES = 10 * 1024 * 1024;

/** Conversas salvas, mais recentes primeiro; `q` busca no nome e no texto importado. */
export async function listConversations(q = '') {
  return (await listAll('/conversations', { q: q.trim() || undefined })).data;
}

/** Envia o .txt; a API reconhece o formato do WhatsApp e evita duplicar a mesma conversa. */
export async function importConversation(file) {
  if (!file || !/\.txt$/i.test(file.name)) throw new AppError('Selecione um arquivo .txt exportado do WhatsApp.');
  if (file.size > MAX_BYTES) throw new AppError('Use um arquivo de até 10 MB.');
  if (file.size === 0) throw new AppError('O arquivo está vazio. Selecione uma conversa com mensagens.');
  const body = new FormData();
  body.append('file', file, file.name);
  return request('/conversations', { method: 'POST', body });
}

export const importSampleConversation = () => request('/conversations/sample', { method: 'POST' });
export const getConversation = id => request(`/conversations/${encodeURIComponent(id)}`);
export const renameConversation = (id, fileName) => request(`/conversations/${encodeURIComponent(id)}`, { method: 'PATCH', body: { fileName: String(fileName ?? '').trim() } });
export const deleteConversation = id => request(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
