import { icon, escapeHTML } from './app-ui.js';

export function accountLabel(session) {
  if (!session?.account) return { name: 'Convidado', detail: 'Sessão de convidado' };
  return { name: session.account.username || session.account.name || session.account.email, detail: session.account.email || 'Conta' };
}

// As conversas salvas usam o mesmo painel sobreposto dos detalhes da conversa.
export function conversationHistoryHTML() {
  return `<div class="drawer-backdrop" id="history-backdrop"></div>
    <aside class="drawer drawer--right history-drawer" id="conversation-history" role="dialog" aria-modal="true" aria-labelledby="history-title">
      <header class="details-header"><h2 id="history-title">Conversas salvas</h2><button class="app-icon-button" id="history-close" type="button" aria-label="Fechar histórico de conversas">${icon('close')}</button></header>
      <div class="details-body history-body">
      <label class="search-field menu-search">${icon('search')}<span class="sr-only">Buscar conversas por nome ou conteúdo</span><input id="conversation-search" type="search" placeholder="Buscar conversas" autocomplete="off" aria-controls="conversation-list"></label>
      <p class="search-count" id="conversation-search-count" role="status" aria-live="polite" hidden></p>
      <ul class="menu-conversations" id="conversation-list"></ul>
    </div></aside>`;
}

/** `conversations` já vem filtrada pela busca da API (nome e texto importado). */
export function updateConversationHistory({ view, conversations, query, currentId, busy, loading = false }) {
  const list = document.getElementById('conversation-list');
  const count = document.getElementById('conversation-search-count');
  count.hidden = !query.trim() || loading;
  count.textContent = `${conversations.length} ${conversations.length === 1 ? 'conversa encontrada' : 'conversas encontradas'}`;
  if (loading) { list.innerHTML = '<li class="menu-empty">Buscando…</li>'; return; }
  list.innerHTML = conversations.length
    ? conversations.map(conversation => `<li class="menu-conversation-row"><button class="menu-conversation" type="button" data-conversation="${escapeHTML(conversation.id)}" title="${escapeHTML(conversation.fileName)}" ${view === 'chat' && conversation.id === currentId ? 'aria-current="true"' : ''} ${busy ? 'disabled' : ''}>${icon('whatsapp')}<span>${escapeHTML(conversation.fileName)}</span></button><div class="menu-conversation-actions"><button class="menu-conversation-action" type="button" data-rename-conversation="${escapeHTML(conversation.id)}" aria-label="Renomear conversa ${escapeHTML(conversation.fileName)}" ${busy ? 'disabled' : ''}>${icon('edit')}</button><button class="menu-conversation-action menu-conversation-action--danger" type="button" data-delete-conversation="${escapeHTML(conversation.id)}" aria-label="Excluir conversa ${escapeHTML(conversation.fileName)}" ${busy ? 'disabled' : ''}>${icon('trash')}</button></div></li>`).join('')
    : `<li class="menu-empty">${query.trim() ? 'Nenhuma conversa encontrada. Tente outro termo.' : 'Nenhuma conversa importada.'}</li>`;
}
