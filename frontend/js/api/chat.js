import { request, stream } from './client.js';
import { toTaskInput } from './tasks.js';

const thread = conversationId => ({ conversationId: conversationId || undefined });

export async function aiStatus() {
  try { return await request('/ai/status'); } catch { return { configured: false, model: '' }; }
}

export const listMessages = async conversationId => (await request('/chat/messages', { query: thread(conversationId) })).data;
export const chatSuggestions = async conversationId => (await request('/chat/suggestions', { query: thread(conversationId) })).data;

// Respostas da IA chegam em streaming (SSE). A API monta o contexto (conversa, histórico,
// tarefas, espaços e a data de hoje); a chave do OpenRouter nunca sai do servidor.
export const askChat = (conversationId, content, options) => stream('/chat/messages', { conversationId: conversationId || null, content }, options);
export const retryChat = (conversationId, options) => stream('/chat/retry', { conversationId: conversationId || null }, options);
export const analyzeConversation = (conversationId, options) => stream('/chat/analysis', { conversationId }, options);

/** `edits` são os valores ajustados em "Editar" antes de confirmar. */
export function confirmProposal(id, edits) {
  let body;
  if (edits) body = 'completedOn' in edits ? { completedOn: edits.completedOn || null } : toTaskInput(edits);
  return request(`/chat/proposals/${encodeURIComponent(id)}/confirm`, { method: 'POST', body });
}
export const discardProposal = id => request(`/chat/proposals/${encodeURIComponent(id)}/discard`, { method: 'POST' });
export const confirmAllProposals = messageId => request(`/chat/messages/${encodeURIComponent(messageId)}/proposals/confirm-all`, { method: 'POST' });
