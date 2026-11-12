import { renderMarkdown } from '../utils/markdown.js';
import { AppError, friendlyError, displayDate, localToday, tomorrow, timeOf, plural, debounce } from '../utils/helpers.js';
import { listConversations, importConversation, importSampleConversation, getConversation, renameConversation, deleteConversation } from '../api/conversations.js';
import { aiStatus, listMessages, chatSuggestions, askChat, retryChat, analyzeConversation, confirmProposal, discardProposal, confirmAllProposals } from '../api/chat.js';
import { taskSummary, getTask, createTask } from '../api/tasks.js';
import { listSpaces } from '../api/spaces.js';
import { getSettings, updateSettings } from '../api/settings.js';
import { logout } from '../api/auth.js';
import { actionListHTML, openTaskEditor, taskFormValues, toAction } from '../components/task-ui.js';
import { createTasksView } from './tasks-view.js';
import { createSpacesView } from './spaces-view.js';
import { startNotifications } from '../services/reminders.js';
import { createDrawer } from '../components/drawer.js';
import { conversationHistoryHTML, updateConversationHistory } from '../components/sidebar.js';
import { openSettings, openUserProfile, accountViewHTML } from '../components/settings.js';
import { icon, escapeHTML, modal, dialogError, runAction, showToast, applyTheme } from '../components/app-ui.js';

const CONFIRMED = { create: 'Tarefa criada.', update: 'Tarefa atualizada.', complete: 'Tarefa concluída.', reopen: 'Tarefa reaberta.', delete: 'Tarefa excluída.' };
const VIEW_TITLES = { chat: 'Conversas', today: 'Hoje', tomorrow: 'Amanhã', week: 'Esta semana', tasks: 'Tarefas', spaces: 'Espaços', account: 'Conta' };
const TASK_VIEWS = ['today', 'tomorrow', 'week', 'tasks'];
const taskPeriod = name => name === 'tasks' ? 'all' : name;
const logo = '<img class="mini-logo" src="/assets/images/sintetiza.svg" width="25" height="25" alt="">';
const fileSize = bytes => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const EMPTY_SUMMARY = { periods: { today: { pending: 0, done: 0 }, tomorrow: { pending: 0, done: 0 }, week: { pending: 0, done: 0 }, all: { pending: 0, done: 0 } }, overdue: 0 };

export async function initInicio(context) {
  const { view, session } = context;
  let settings = context.settings;
  const state = {
    conversations: [], historyQuery: '', historyResults: null, historyLoading: false,
    conversation: null, messages: [], suggestions: [], tasksById: new Map(),
    spaces: [], unassigned: { pending: 0, done: 0, total: 0 }, summary: EMPTY_SUMMARY,
    view: 'today', space: null, busy: false, controller: null, error: null, ai: { configured: false, model: '' },
  };
  let notifications;

  document.querySelector('[data-app-header]').innerHTML = `<header class="app-header chat-header">
    <button class="app-icon-button" id="back-button" type="button" aria-label="Voltar" hidden>${icon('back')}</button>
    <div class="chat-title"><h1 id="view-title">Sintetiza</h1><span class="chat-online"><span class="online-dot" id="ai-dot"></span><span id="chat-subtitle"></span></span></div>
    <button class="app-icon-button" id="conversation-details" type="button" aria-label="Detalhes da conversa" aria-controls="details-drawer" aria-expanded="false" hidden>${icon('info')}</button>
    <button class="app-icon-button" id="header-import" type="button" aria-label="Importar conversa do WhatsApp">${icon('upload')}</button>
    <button class="app-icon-button" id="header-history" type="button" title="Conversas salvas" aria-label="Abrir histórico de conversas" aria-controls="conversation-history" aria-expanded="false">${icon('files-history')}</button>
  </header>`;
  view.insertAdjacentHTML('afterend', `<section id="tasks-view" class="app-content tasks-view" aria-label="Tarefas" hidden></section>
    <section id="spaces-view" class="app-content tasks-view" aria-label="Espaços" hidden></section>
    <section id="account-view" class="app-content account-view" aria-label="Conta" hidden></section>`);
  document.querySelector('main').insertAdjacentHTML('beforeend', conversationHistoryHTML());
  document.querySelector('main').insertAdjacentHTML('beforeend', `<div class="drawer-backdrop" id="details-backdrop"></div>
    <aside class="drawer drawer--right details-drawer" id="details-drawer" role="dialog" aria-modal="true" aria-labelledby="details-title">
      <header class="details-header"><h2 id="details-title">Detalhes da conversa</h2><button class="app-icon-button" id="details-close" type="button" aria-label="Fechar detalhes">${icon('close')}</button></header>
      <div class="details-body" id="details-body"></div>
    </aside>`);
  view.classList.add('chat-messages');
  view.hidden = true;
  view.setAttribute('role', 'log');
  view.setAttribute('aria-live', 'polite');
  document.getElementById('app-footer').innerHTML = `<form id="chat-form" class="chat-composer" novalidate>
    <label class="sr-only" for="chat-question">Sua mensagem</label>
    <textarea id="chat-question" class="app-input chat-input" name="question" rows="1" maxlength="4000" autocomplete="off"></textarea>
    <button class="chat-send" id="chat-send" type="submit" aria-label="Enviar mensagem">${icon('send')}</button>
  </form>
  <input type="file" id="conversation-file" accept=".txt,text/plain" hidden>`;
  const navItem = (name, label, symbol, description = label) => `<button type="button" data-bottom-nav="${name}" aria-label="${description}">${icon(symbol)}<span>${label}</span></button>`;
  document.getElementById('app-footer').insertAdjacentHTML('afterend', `<nav class="bottom-nav" id="bottom-nav" aria-label="Navegação principal">
    ${navItem('today', 'Tarefas', 'tasks')}${navItem('spaces', 'Espaços', 'folder')}
    <button type="button" class="footer-create-task" id="footer-create-task" aria-label="Criar tarefa" title="Criar tarefa" aria-haspopup="dialog">${icon('plus')}</button>
    ${navItem('chat', 'Conversas', 'chat-ai', 'Conversas com IA: importar e analisar conversas')}${navItem('account', 'Conta', 'user')}
  </nav>`);

  const input = document.getElementById('chat-question');
  const sendButton = document.getElementById('chat-send');
  const fileInput = document.getElementById('conversation-file');
  const tasksContainer = document.getElementById('tasks-view');
  const spacesContainer = document.getElementById('spaces-view');
  const accountContainer = document.getElementById('account-view');
  accountContainer.innerHTML = accountViewHTML(session);
  const periods = () => state.summary.periods;
  const tasksView = createTasksView({
    container: tasksContainer, getSpaces: () => state.spaces,
    hasTasks: () => periods().all.pending + periods().all.done > 0,
    onChange: () => refreshTasks(),
    onOpenSpace: id => openSpace(id, state.view),
    onOpenPeriod: name => showView(name),
  });
  const spacesView = createSpacesView({
    container: spacesContainer,
    onChange: () => refreshTasks(),
    onOpenSpace: id => openSpace(id, 'spaces'),
  });
  const panelParts = () => [document.querySelector('[data-app-header]'), view, tasksContainer, spacesContainer, accountContainer, document.getElementById('app-footer'), document.getElementById('bottom-nav')];
  const conversationUrl = () => state.conversation ? `/inicio.html?conversa=${encodeURIComponent(state.conversation.id)}` : '/inicio.html?nova=1';

  // Tarefas atuais das propostas pendentes (para o "de → para" e para saber se ainda existem).
  async function loadProposalTasks() {
    const ids = new Set();
    for (const message of state.messages) {
      for (const proposal of message.proposals || []) {
        if (proposal.status === 'pending' && proposal.type !== 'create' && proposal.taskId) ids.add(proposal.taskId);
      }
    }
    const tasks = await Promise.all([...ids].map(id => getTask(id).catch(() => null)));
    state.tasksById = new Map(tasks.filter(Boolean).map(task => [task.id, task]));
  }

  async function loadThread() {
    const id = state.conversation?.id || null;
    const [messages, suggestions] = await Promise.all([listMessages(id), chatSuggestions(id).catch(() => [])]);
    state.messages = messages;
    state.suggestions = suggestions;
    await loadProposalTasks();
  }

  async function refreshTasks({ messages = false } = {}) {
    const [spaces, summary] = await Promise.all([listSpaces(), taskSummary()]);
    state.spaces = spaces.data;
    state.unassigned = spaces.meta?.unassigned || state.unassigned;
    state.summary = summary;
    if (state.space && state.space.id !== 'none' && !state.spaces.some(space => space.id === state.space.id)) {
      state.space = null;
      tasksView.clearSpace();
    }
    if (messages) await loadThread();
    else await loadProposalTasks();
    render({ keepScroll: true });
    if (TASK_VIEWS.includes(state.view)) await tasksView.render();
    if (state.view === 'spaces') await spacesView.render();
  }

  // O rodapé alterna entre o chat e as telas Tarefas, Espaços e Conta.
  // `space` indica Tarefas mostrando um único espaço: { id, from } diz para onde o voltar retorna.
  function showView(name, { space = null } = {}) {
    const changed = name !== state.view;
    state.view = name;
    state.space = space;
    tasksView.setPeriod(TASK_VIEWS.includes(name) ? taskPeriod(name) : 'all');
    if (name === 'tasks' && !space) tasksView.clearSpace();
    view.hidden = name !== 'chat';
    document.getElementById('app-footer').hidden = name !== 'chat';
    tasksContainer.hidden = !TASK_VIEWS.includes(name);
    tasksContainer.setAttribute('aria-label', `Tarefas: ${VIEW_TITLES[name] || 'Todas'}`);
    spacesContainer.hidden = name !== 'spaces';
    accountContainer.hidden = name !== 'account';
    if (TASK_VIEWS.includes(name)) tasksView.render();
    if (changed) tasksContainer.scrollTop = 0;
    if (name === 'spaces') spacesView.render();
    if (name === 'chat') view.scrollTop = view.scrollHeight;
    const url = name === 'chat' ? conversationUrl() : name === 'today' ? '/inicio.html' : `/inicio.html?view=${name}`;
    history.replaceState(null, '', url);
    updateChrome();
  }

  function openSpace(id, from) {
    tasksView.showSpace(id);
    showView('tasks', { space: { id, from } });
  }

  function updateChrome() {
    const ready = state.ai.configured;
    const chat = state.view === 'chat';
    document.querySelector('[data-app-header]').hidden = state.view === 'today';
    document.querySelectorAll('[data-bottom-nav]').forEach(button => {
      if (button.dataset.bottomNav === state.view || button.dataset.bottomNav === 'today' && TASK_VIEWS.includes(state.view)) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.title = `${VIEW_TITLES[state.view]} — Sintetiza`;
    const dot = document.getElementById('ai-dot');
    dot.className = `online-dot ${ready ? '' : 'online-dot--off'}`;
    dot.hidden = !chat;
    document.querySelector('.chat-online').hidden = !chat;
    const space = state.view === 'tasks' && state.space;
    const back = document.getElementById('back-button');
    back.hidden = !space;
    if (space) back.setAttribute('aria-label', `Voltar para ${VIEW_TITLES[space.from]}`);
    const spaceRecord = space && space.id !== 'none' ? state.spaces.find(record => record.id === space.id) : null;
    const inSpace = space ? (space.id === 'none' ? state.unassigned.pending : spaceRecord?.counts.pending || 0) : 0;
    document.getElementById('view-title').textContent = space
      ? (space.id === 'none' ? 'Sem espaço' : spaceRecord?.name || 'Espaço')
      : VIEW_TITLES[state.view];
    document.getElementById('chat-subtitle').textContent = chat
      ? state.conversation?.fileName || (ready ? 'Assistente de conversas' : 'IA não configurada')
      : space ? plural(inSpace, 'tarefa pendente', 'tarefas pendentes')
      : state.view === 'today' ? plural(periods().today.pending, 'tarefa pendente hoje', 'tarefas pendentes hoje')
      : state.view === 'tomorrow' || state.view === 'week' ? plural(periods()[state.view].pending, 'tarefa pendente', 'tarefas pendentes')
      : state.view === 'tasks' ? plural(periods().all.pending, 'tarefa pendente', 'tarefas pendentes')
      : state.view === 'account' ? 'Seu perfil e suas preferências' : plural(state.spaces.length, 'espaço', 'espaços');
    input.placeholder = state.conversation ? 'Pergunte sobre a conversa…' : 'Faça uma pergunta ou peça tarefas…';
    sendButton.innerHTML = icon(state.busy ? 'stop' : 'send');
    sendButton.setAttribute('aria-label', state.busy ? 'Parar resposta' : 'Enviar mensagem');
    sendButton.classList.toggle('chat-send--stop', state.busy);
    document.getElementById('header-import').disabled = state.busy;
    document.getElementById('header-import').hidden = !chat;
    document.getElementById('header-history').hidden = !chat;
    document.getElementById('conversation-details').hidden = !chat || !state.conversation;
    updateConversationHistory({
      view: state.view, query: state.historyQuery, currentId: state.conversation?.id, busy: state.busy, loading: state.historyLoading,
      conversations: state.historyQuery.trim() ? state.historyResults || [] : state.conversations,
    });
  }

  function importCard() {
    return `<section class="import-card" aria-labelledby="import-heading">
      <div class="import-illustration" aria-hidden="true">${icon('whatsapp', 'import-whatsapp')}${icon('arrow', 'import-arrow')}${icon('file', 'import-document')}</div>
      <p class="import-eyebrow">Recurso extra</p>
      <h2 id="import-heading" class="import-heading">Da conversa para a lista de tarefas</h2>
      <p class="import-description">Importe uma conversa para encontrar o que precisa ser feito. A IA resume o texto e sugere tarefas para você revisar e criar.</p>
      <button class="button button--primary import-button w-full" id="select-conversation" type="button">${icon('upload')}Selecionar arquivo</button>
      <p class="import-drop">ou arraste o arquivo para cá</p>
      <p class="import-format">Arquivo .txt exportado do WhatsApp · até 10 MB</p>
      <div class="import-links"><button class="import-help" id="export-help" type="button">${icon('help')}Como exportar</button><button class="import-help" id="sample-conversation" type="button">${icon('file')}Usar um exemplo</button></div>
    </section>`;
  }

  // Detalhes calculados pela API, sem IA.
  function detailsHTML(conversation) {
    const first = conversation.firstMessageOn;
    const last = conversation.lastMessageOn;
    const period = !first ? '' : first === last ? displayDate(first) : `${displayDate(first)} a ${displayDate(last)}`;
    const imported = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(conversation.createdAt));
    const people = (conversation.participants || []).map(person => `<li><span class="details-person"><span>${escapeHTML(person.name)}</span><span>${plural(person.messageCount, 'mensagem', 'mensagens')} · ${person.share}%</span></span><span class="details-bar" aria-hidden="true"><span style="width:${Number(person.share) || 0}%"></span></span></li>`).join('');
    return `<div class="details-file">${icon('whatsapp')}<span><strong>${escapeHTML(conversation.fileName)}</strong><small>Importada em ${escapeHTML(imported)} · ${fileSize(conversation.sizeBytes)}</small></span></div>
      <ul class="info-stats">
        <li><strong>${conversation.messageCount.toLocaleString('pt-BR')}</strong><span>${conversation.messageCount === 1 ? 'mensagem' : 'mensagens'}</span></li>
        <li><strong>${conversation.participantCount}</strong><span>${conversation.participantCount === 1 ? 'participante' : 'participantes'}</span></li>
        <li><strong>${conversation.activeDays}</strong><span>${conversation.activeDays === 1 ? 'dia' : 'dias'} com conversa</span></li>
      </ul>
      ${period ? `<section class="details-section"><h3>Período</h3><p class="details-period">${icon('calendar')}<span>${escapeHTML(period)}</span></p></section>` : ''}
      <section class="details-section"><h3>Participantes</h3>${people ? `<ul class="details-people">${people}</ul>` : '<p class="details-empty">Nenhum participante identificado.</p>'}</section>`;
  }

  const detailsButton = document.getElementById('conversation-details');
  const details = createDrawer({
    drawer: document.getElementById('details-drawer'), backdrop: document.getElementById('details-backdrop'),
    trigger: detailsButton, focusTarget: document.getElementById('details-close'), inertElements: panelParts,
  });
  const historyButton = document.getElementById('header-history');
  const historyPanel = createDrawer({
    drawer: document.getElementById('conversation-history'), backdrop: document.getElementById('history-backdrop'),
    trigger: historyButton, focusTarget: document.getElementById('history-close'), inertElements: panelParts,
  });

  async function openDetails() {
    if (!state.conversation) return;
    historyPanel.close({ returnFocus: false });
    document.getElementById('details-body').innerHTML = detailsHTML(state.conversation);
    details.open();
    try {
      state.conversation = await getConversation(state.conversation.id);
      document.getElementById('details-body').innerHTML = detailsHTML(state.conversation);
    } catch { /* mantém os dados já carregados */ }
  }
  const closeDetails = () => details.close();

  async function leave() {
    notifications?.stop();
    await logout();
    location.href = '/index.html';
  }

  async function reloadConversations() {
    state.conversations = await listConversations();
    if (state.historyQuery.trim()) await searchHistory();
  }

  async function searchHistory() {
    const query = state.historyQuery;
    if (!query.trim()) { state.historyResults = null; state.historyLoading = false; updateChrome(); return; }
    try {
      const results = await listConversations(query);
      if (query === state.historyQuery) state.historyResults = results;
    } catch (error) {
      showToast(friendlyError(error), 'error');
    } finally {
      if (query === state.historyQuery) { state.historyLoading = false; updateChrome(); }
    }
  }
  const searchHistoryLater = debounce(searchHistory, 250);

  function bindNavigation() {
    document.getElementById('conversation-search').addEventListener('input', event => {
      state.historyQuery = event.target.value;
      state.historyLoading = Boolean(state.historyQuery.trim());
      updateChrome();
      searchHistoryLater();
    });
    document.querySelectorAll('[data-bottom-nav]').forEach(button => button.addEventListener('click', () => showView(button.dataset.bottomNav)));
    document.getElementById('conversation-list').addEventListener('click', event => {
      const action = event.target.closest('[data-rename-conversation], [data-delete-conversation]');
      const pool = [...state.conversations, ...(state.historyResults || [])];
      if (action) {
        if (action.disabled || state.busy) return;
        const rename = action.hasAttribute('data-rename-conversation');
        const id = rename ? action.dataset.renameConversation : action.dataset.deleteConversation;
        const conversation = pool.find(record => record.id === id);
        if (!conversation) return;
        historyPanel.close();
        if (rename) openRenameConversation(conversation);
        else openDeleteConversation(conversation);
        return;
      }
      const button = event.target.closest('[data-conversation]');
      if (!button || button.disabled) return;
      historyPanel.close();
      showView('chat');
      openConversation(button.dataset.conversation).catch(error => showToast(friendlyError(error), 'error'));
    });
  }

  function openRenameConversation(conversation) {
    const { dialog } = modal(`<h2>Renomear conversa</h2><form novalidate>
      <label class="dialog-field-label" for="conversation-name">Nome da conversa</label><input class="app-input" id="conversation-name" name="name" type="text" maxlength="160" required autofocus>
      ${dialogError()}<button class="button button--primary w-full" type="submit">Salvar</button><button class="button button--subtle w-full" data-cancel-conversation type="button">Cancelar</button></form>`,
      async (data, dialog) => {
        if (!String(data.get('name') || '').trim()) throw new AppError('Informe um nome de até 160 caracteres.');
        const updated = await renameConversation(conversation.id, data.get('name'));
        await reloadConversations();
        if (state.conversation?.id === conversation.id) state.conversation = updated;
        await refreshTasks();
        dialog.close();
        showToast('Conversa renomeada.');
      });
    dialog.querySelector('#conversation-name').value = conversation.fileName;
    dialog.querySelector('#conversation-name').select();
    dialog.querySelector('[data-cancel-conversation]').addEventListener('click', () => dialog.close());
  }

  function openDeleteConversation(conversation) {
    const { dialog } = modal(`<h2>Excluir conversa?</h2><p class="session-email">${escapeHTML(conversation.fileName)}</p><p class="danger-note">A conversa e o histórico de mensagens serão removidos da sua conta. As tarefas criadas continuam salvas. Esta ação é definitiva.</p>
      <form>${dialogError()}<button class="button button--danger w-full" type="submit">Excluir conversa</button><button class="button button--subtle w-full" data-cancel-conversation type="button" autofocus>Cancelar</button></form>`,
      async (_data, dialog) => {
        await deleteConversation(conversation.id);
        await reloadConversations();
        if (state.conversation?.id === conversation.id) await openConversation(null);
        await refreshTasks();
        dialog.close();
        showToast('Conversa excluída.');
      }, 'Excluindo…');
    dialog.querySelector('[data-cancel-conversation]').addEventListener('click', () => dialog.close());
  }

  function messageHTML(message) {
    const time = `<time class="chat-time" datetime="${escapeHTML(message.createdAt)}">${escapeHTML(timeOf(message.createdAt))}</time>`;
    if (message.role === 'user') {
      return `<article class="chat-message chat-message--user" aria-label="Sua mensagem"><div class="chat-bubble"><p>${escapeHTML(message.content)}</p>${time}</div></article>`;
    }
    const actions = message.proposals?.length ? actionListHTML(message, state.tasksById) : '';
    return `<article class="chat-message chat-message--assistant" aria-label="Resposta do Sintetiza">${logo}<div class="chat-bubble ${actions ? 'chat-bubble--actions' : ''}"><div class="markdown">${renderMarkdown(message.content)}</div>${actions}${time}</div></article>`;
  }

  function render({ keepScroll = false } = {}) {
    const scrollTop = view.scrollTop;
    updateChrome();
    let html = state.conversation ? '' : importCard();
    html += state.messages.map(messageHTML).join('');
    if (state.error) {
      html += `<article class="chat-message chat-message--assistant chat-message--error" role="alert">${logo}<div class="chat-bubble"><p></p><button class="text-link" id="retry-answer" type="button">Tentar novamente</button></div></article>`;
    } else if (!state.busy && state.ai.configured && state.suggestions.length) {
      // Perguntas sobre a conversa e comandos que acionam as funções do app (tarefas).
      html += `<div class="chat-suggestions" aria-label="Sugestões de perguntas e comandos">${state.suggestions.map(suggestion => `<button type="button" class="chat-suggestion" data-suggestion="${escapeHTML(suggestion.text)}" data-kind="${escapeHTML(suggestion.kind)}">${escapeHTML(suggestion.text)}</button>`).join('')}</div>`;
    }
    view.innerHTML = html;
    // Erros podem trazer texto de fora do app: entram como texto.
    if (state.error) view.querySelector('.chat-message--error p').textContent = state.error.message;
    bindView();
    view.scrollTop = keepScroll ? scrollTop : view.scrollHeight;
  }

  function findProposal(id) {
    for (const message of state.messages) {
      const proposal = message.proposals?.find(record => record.id === id);
      if (proposal) return proposal;
    }
    return null;
  }

  function bindView() {
    document.getElementById('select-conversation')?.addEventListener('click', () => fileInput.click());
    document.getElementById('export-help')?.addEventListener('click', openExportHelp);
    document.getElementById('sample-conversation')?.addEventListener('click', event => runAction(event.currentTarget, () => importResult(importSampleConversation())));
    document.getElementById('retry-answer')?.addEventListener('click', () => {
      const { kind, question } = state.error;
      generate(kind, question).catch(error => showToast(friendlyError(error), 'error'));
    });
    view.querySelectorAll('[data-suggestion]').forEach(button => button.addEventListener('click', () => ask(button.dataset.suggestion)));
    view.querySelectorAll('.action-card').forEach(bindActionCard);
    view.querySelectorAll('[data-confirm-all]').forEach(button => button.addEventListener('click', () => runAction(button, async () => {
      try {
        const result = await confirmAllProposals(button.dataset.confirmAll);
        if (result.failures?.length) showToast(`${plural(result.confirmed, 'proposta confirmada', 'propostas confirmadas')}; ${result.failures.length} não: ${result.failures[0].message}`, 'error');
        else showToast('Propostas confirmadas.');
      } finally { await refreshTasks({ messages: true }); }
    })));
  }

  function bindActionCard(card) {
    const proposal = findProposal(card.dataset.proposalId);
    if (!proposal) return;
    const action = toAction(proposal);
    const task = state.tasksById.get(action.taskId);
    const confirm = async edits => {
      try { await confirmProposal(action.id, edits); }
      finally { await refreshTasks({ messages: true }); }
      showToast(CONFIRMED[action.type]);
    };
    card.querySelector('[data-action="confirm"]')?.addEventListener('click', event => runAction(event.currentTarget, () => confirm()));
    card.querySelector('[data-action="discard"]')?.addEventListener('click', event => runAction(event.currentTarget, async () => {
      try { await discardProposal(action.id); }
      finally { await refreshTasks({ messages: true }); }
    }));
    card.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
      let values;
      if (action.type === 'create') values = { title: action.title, description: action.description, assignee: action.assignee, dueOn: action.dueOn, priority: action.priority, spaceName: action.space || undefined };
      else if (action.type === 'complete') values = { completedOn: action.completedOn || localToday() };
      else {
        const { space, ...changes } = action.changes;
        values = { ...taskFormValues(task), ...changes };
        if (space !== undefined) { delete values.spaceId; values.spaceName = space || ''; }
      }
      openTaskEditor({
        heading: { create: 'Revisar nova tarefa', update: 'Revisar edição', complete: 'Concluir tarefa' }[action.type],
        completedOnly: action.type === 'complete', values, spaces: state.spaces, submitLabel: 'Confirmar', onSubmit: confirm,
      });
    });
  }

  function liveAnswer() {
    const article = document.createElement('article');
    article.className = 'chat-message chat-message--assistant';
    article.setAttribute('aria-label', 'Resposta do Sintetiza');
    article.setAttribute('aria-busy', 'true');
    article.innerHTML = `${logo}<div class="chat-bubble"><div class="markdown"><span class="typing" aria-label="Escrevendo"><span></span><span></span><span></span></span></div></div>`;
    view.querySelector('.chat-suggestions')?.remove();
    view.append(article);
    view.scrollTop = view.scrollHeight;
    const body = article.querySelector('.markdown');
    let pending = null;
    return text => {
      pending = text;
      requestAnimationFrame(() => {
        if (pending === null) return;
        const stick = view.scrollHeight - view.scrollTop - view.clientHeight < 80;
        body.innerHTML = renderMarkdown(pending);
        pending = null;
        if (stick) view.scrollTop = view.scrollHeight;
      });
    };
  }

  /**
   * Pede uma resposta à IA pela API, em streaming.
   * kind: 'ask' (nova pergunta), 'retry' (pergunta já salva sem resposta) ou 'analysis'.
   */
  async function generate(kind, question = '') {
    if (state.busy) return;
    const conversationId = state.conversation?.id || null;
    state.busy = true;
    state.error = null;
    state.controller = new AbortController();
    if (kind === 'ask') state.messages.push({ id: 'pending-question', role: 'user', content: question, createdAt: new Date().toISOString(), proposals: [] });
    render();
    const update = liveAnswer();
    let text = '';
    let saved = kind !== 'ask';
    let answered = false;
    let aborted = false;
    const options = {
      signal: state.controller.signal,
      onEvent: event => {
        if (event.type === 'user_message') saved = true;
        if (event.type === 'delta') { text += event.text; update(text); }
        if (event.type === 'assistant_message') answered = true;
      },
    };
    try {
      if (kind === 'analysis') await analyzeConversation(conversationId, options);
      else if (kind === 'retry') await retryChat(conversationId, options);
      else await askChat(conversationId, question, options);
      if (!answered) throw new AppError('A IA não retornou uma resposta. Tente novamente.');
    } catch (error) {
      if (error.name === 'AbortError') aborted = true;
      else {
        // Pergunta salva: "Tentar novamente" usa /chat/retry. Não salva (ex.: IA indisponível): reenvia.
        const retryKind = kind === 'analysis' ? 'analysis' : saved ? 'retry' : 'ask';
        state.error = { kind: retryKind, question, message: error instanceof AppError ? error.message : 'Não foi possível obter a resposta da IA. Tente novamente.' };
      }
    } finally {
      state.busy = false;
      state.controller = null;
      // Ao interromper, a API salva o trecho recebido assim que percebe a conexão fechada.
      if (aborted) await wait(600);
      try { await loadThread(); } catch (error) { showToast(friendlyError(error), 'error'); }
      if (!state.error && !aborted) state.summary = await taskSummary().catch(() => state.summary);
      render();
    }
  }

  async function ask(question) {
    question = question.trim();
    if (!question || state.busy) return;
    input.value = '';
    resizeInput();
    await generate('ask', question);
  }

  async function openConversation(id, { analyze = false } = {}) {
    let conversation = null;
    if (id) {
      try { conversation = await getConversation(id); }
      catch (error) { if (error.status !== 404) throw error; showToast('Essa conversa não existe mais.', 'error'); }
    }
    state.conversation = conversation;
    state.error = null;
    await loadThread();
    if (state.view === 'chat') history.replaceState(null, '', conversationUrl());
    render();
    if (analyze) await generate('analysis');
  }

  async function importResult(pending) {
    if (state.busy) return;
    const { created, conversation } = await pending;
    closeDetails();
    historyPanel.close({ returnFocus: false });
    await reloadConversations();
    showView('chat');
    showToast(created ? `Conversa importada: ${plural(conversation.messageCount, 'mensagem', 'mensagens')}.` : 'Essa conversa já tinha sido importada. Abrimos o histórico dela.');
    await openConversation(conversation.id, { analyze: created && state.ai.configured });
  }

  const importFile = file => importResult(importConversation(file));

  function openExportHelp() {
    modal(`<h2>Exportar uma conversa</h2>
      <p>No WhatsApp, abra a conversa, toque no nome do contato ou grupo e escolha <strong>Exportar conversa</strong>. Selecione <strong>Sem mídia</strong> e salve o arquivo .txt.</p>
      <p>O Sintetiza aceita arquivos de até 10 MB. O arquivo fica salvo na sua conta e o texto é enviado à IA (DeepSeek, via OpenRouter) para gerar as respostas.</p>
      <a class="dialog-link" href="/assets/files/conversa-exemplo.txt" download>Baixar uma conversa de exemplo</a>`);
  }

  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }

  document.getElementById('chat-form').addEventListener('submit', event => {
    event.preventDefault();
    if (state.busy) { state.controller?.abort(); return; }
    ask(input.value).catch(error => showToast(friendlyError(error), 'error'));
  });
  input.addEventListener('input', resizeInput);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      document.getElementById('chat-form').requestSubmit();
    }
  });
  document.getElementById('header-import').addEventListener('click', () => fileInput.click());
  const openQuickTask = () => openTaskEditor({
    heading: 'Nova tarefa', submitLabel: 'Criar tarefa', spaces: state.spaces,
    values: { dueOn: state.view === 'tomorrow' ? tomorrow() : state.view === 'today' || state.view === 'week' ? localToday() : '', spaceId: state.space?.id === 'none' ? '' : state.space?.id || '' },
    onSubmit: async values => { await createTask(values); await refreshTasks(); showToast('Tarefa criada.'); },
  });
  document.getElementById('footer-create-task').addEventListener('click', openQuickTask);
  document.getElementById('account-logout').addEventListener('click', event => runAction(event.currentTarget, leave));
  accountContainer.querySelector('[data-account-action="profile"]').addEventListener('click', () => openUserProfile({ session, onLogout: leave }));
  accountContainer.querySelector('[data-account-action="settings"]').addEventListener('click', event => runAction(event.currentTarget, async () => {
    [settings, state.ai] = await Promise.all([getSettings(), aiStatus()]);
    openSettings({
      ai: state.ai, theme: settings.theme, reminder: settings.dailyReminder, timezone: settings.timezone,
      onReminder: async value => { settings = await updateSettings({ dailyReminder: value }); await notifications?.check(); },
      onTheme: async value => { applyTheme(value); settings = await updateSettings({ theme: value }); },
      onLogout: leave,
    });
    updateChrome();
  }));
  detailsButton.addEventListener('click', openDetails);
  historyButton.addEventListener('click', () => {
    closeDetails();
    historyPanel.open();
  });
  document.getElementById('history-close').addEventListener('click', () => historyPanel.close());
  document.getElementById('back-button').addEventListener('click', () => {
    const from = state.space?.from || 'spaces';
    showView(from);
    document.querySelector(`[data-bottom-nav="${TASK_VIEWS.includes(from) ? 'today' : from}"]`)?.focus({ preventScroll: true });
  });
  document.getElementById('details-close').addEventListener('click', closeDetails);
  bindNavigation();
  fileInput.addEventListener('change', () => {
    const [file] = fileInput.files;
    fileInput.value = '';
    if (file) runAction(document.getElementById('header-import'), () => importFile(file));
  });

  const panel = document.querySelector('main');
  const hasFiles = event => [...(event.dataTransfer?.types || [])].includes('Files');
  panel.addEventListener('dragover', event => {
    if (!hasFiles(event) || state.busy) return;
    event.preventDefault();
    panel.classList.add('is-dropping');
  });
  panel.addEventListener('dragleave', event => { if (!panel.contains(event.relatedTarget)) panel.classList.remove('is-dropping'); });
  panel.addEventListener('drop', event => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    panel.classList.remove('is-dropping');
    const [file] = event.dataTransfer.files;
    if (file && !state.busy) importFile(file).catch(error => showToast(friendlyError(error), 'error'));
  });

  const params = new URLSearchParams(location.search);
  const [ai, conversations, spaces, summary] = await Promise.all([aiStatus(), listConversations(), listSpaces(), taskSummary()]);
  state.ai = ai;
  state.conversations = conversations;
  state.spaces = spaces.data;
  state.unassigned = spaces.meta?.unassigned || state.unassigned;
  state.summary = summary;
  const initial = params.get('conversa') || (params.has('nova') ? null : conversations[0]?.id);
  await openConversation(initial || null);
  const requested = params.has('conversa') || params.has('nova') || params.get('view') === 'chat' ? 'chat'
    : ['tasks', 'tomorrow', 'week', 'spaces', 'account'].includes(params.get('view')) ? params.get('view') : 'today';
  showView(requested);
  notifications = startNotifications({
    onNotification: notification => showToast(notification.body),
    onNewDay: () => refreshTasks(),
    onOpenToday: () => showView('today'),
    onError: error => showToast(friendlyError(error), 'error'),
  });
  window.addEventListener('pagehide', event => { if (!event.persisted) notifications.stop(); });
}
