import { icon, escapeHTML, modal, dialogError, runAction } from './app-ui.js';
import { AppError, displayDate, localToday, tomorrow, spaceKey } from '../utils/helpers.js';
import { PRIORITIES } from '../api/tasks.js';

const NEW_SPACE = '__new__';

const ACTION_LABELS = { create: 'Nova tarefa', update: 'Editar tarefa', complete: 'Concluir tarefa', reopen: 'Reabrir tarefa', delete: 'Excluir tarefa' };
const DONE_LABELS = { create: 'Tarefa criada', update: 'Tarefa atualizada', complete: 'Tarefa concluída', reopen: 'Tarefa reaberta', delete: 'Tarefa excluída' };
const FIELD_LABELS = { title: 'Título', description: 'Descrição', assignee: 'Responsável', dueOn: 'Prazo', space: 'Espaço', priority: 'Prioridade' };
const shown = (field, value) => field === 'dueOn' ? displayDate(value) || 'sem prazo' : field === 'space' ? value || 'sem espaço' : field === 'priority' ? PRIORITIES[value] || 'sem prioridade' : value || '—';
const priorityLabel = priority => PRIORITIES[priority] ? `<span class="priority-label priority-label--${priority}">${PRIORITIES[priority]}</span>` : '';
const spaceMeta = name => `<span class="task-meta task-meta--space">${icon('folder')}<span>${escapeHTML(name || 'Sem espaço')}</span></span>`;

function meta(assignee, dueOn) {
  return `<span class="task-meta">${icon('user')}<span>${escapeHTML(assignee || 'Sem responsável')}</span></span>
    <span class="task-meta">${icon('calendar')}<span>${dueOn ? `Prazo ${escapeHTML(displayDate(dueOn))}` : 'Sem prazo'}</span></span>`;
}

/**
 * Proposta da API -> modelo do cartão. O conteúdo proposto fica em `payload`
 * (create: `task`, update: `changes`, complete: `completedOn`); depois de
 * confirmada, `result` traz o que foi gravado.
 */
export function toAction(proposal) {
  const payload = proposal.payload || {};
  const result = proposal.status === 'confirmed' ? proposal.result || {} : {};
  const action = { id: proposal.id, type: proposal.type, status: proposal.status, taskId: proposal.taskId, taskTitle: proposal.taskTitle, spaceIsNew: proposal.spaceIsNew };
  if (proposal.type === 'create') {
    const task = { ...(payload.task || {}) };
    for (const field of ['title', 'description', 'assignee', 'dueOn', 'priority', 'space']) if (field in result) task[field] = result[field];
    return { ...action, ...task };
  }
  if (proposal.type === 'update') return { ...action, changes: payload.changes || {} };
  if (proposal.type === 'complete') return { ...action, completedOn: result.completedOn || payload.completedOn || '' };
  return action;
}

// Uma proposta da IA. Nada é salvo antes da confirmação.
export function actionCardHTML(action, task) {
  const pending = action.status === 'pending';
  const missing = action.type !== 'create' && !task && pending;
  // Espaço sugerido que ainda não existe: só é criado ao confirmar.
  const proposedSpace = name => name && pending && action.spaceIsNew ? `${name} (novo)` : name;
  let body;
  if (action.type === 'create') {
    body = `${priorityLabel(action.priority)}<p class="action-title">${escapeHTML(action.title)}</p>${action.description ? `<p class="action-description">${escapeHTML(action.description)}</p>` : ''}<div class="action-meta">${spaceMeta(proposedSpace(action.space))}${meta(action.assignee, action.dueOn)}</div>`;
  } else {
    body = `<p class="action-title">${escapeHTML(task?.title || action.taskTitle || 'Tarefa não encontrada')}</p>`;
    if (action.type === 'update') {
      const current = field => field === 'space' ? task.space?.name : task[field];
      body += `<ul class="action-changes">${Object.entries(action.changes).map(([field, value]) => `<li><span>${FIELD_LABELS[field] || field}</span>${task && pending ? `<s>${escapeHTML(shown(field, current(field)))}</s> → ` : ''}<strong>${escapeHTML(shown(field, field === 'space' ? proposedSpace(value) : value))}</strong></li>`).join('')}</ul>`;
    }
    if (action.type === 'complete') body += `<div class="action-meta"><span class="task-meta">${icon('check')}<span>Concluída em ${escapeHTML(displayDate(action.completedOn) || 'hoje')}</span></span></div>`;
  }
  let footer;
  if (pending) {
    footer = missing ? '<p class="action-status">Essa tarefa não existe mais.</p><div class="action-buttons"><button type="button" class="action-button" data-action="discard">Descartar</button></div>' : `<div class="action-buttons">
      <button type="button" class="action-button action-button--primary" data-action="confirm">${icon('check')}${action.type === 'delete' ? 'Confirmar exclusão' : 'Confirmar'}</button>
      ${action.type === 'reopen' || action.type === 'delete' ? '' : `<button type="button" class="action-button" data-action="edit">${icon('edit')}Editar</button>`}
      <button type="button" class="action-button action-button--plain" data-action="discard">Descartar</button>
    </div>`;
  } else {
    const status = { confirmed: `${icon('check')}${DONE_LABELS[action.type]}`, discarded: 'Descartada', superseded: 'Substituída pela proposta mais recente' }[action.status];
    footer = `<p class="action-status action-status--${action.status}">${status}</p>`;
  }
  return `<li class="action-card action-card--${action.type} action-card--${action.status}" data-proposal-id="${escapeHTML(action.id)}">
    <p class="action-label">${ACTION_LABELS[action.type]}</p>${body}${footer}
  </li>`;
}

/** `tasksById` contém as tarefas atuais das propostas pendentes; ausentes foram excluídas. */
export function actionListHTML(message, tasksById) {
  const actions = message.proposals.map(toAction);
  const pending = actions.filter(action => action.status === 'pending' && (action.type === 'create' || tasksById.has(action.taskId))).length;
  return `<ul class="action-list" aria-label="Propostas de tarefas">${actions.map(action => actionCardHTML(action, tasksById.get(action.taskId))).join('')}</ul>
    ${pending > 1 ? `<button type="button" class="action-button action-button--primary action-confirm-all" data-confirm-all="${escapeHTML(message.id)}">${icon('check')}Confirmar todas (${pending})</button>` : ''}`;
}

function compactDueDate(dueOn) {
  if (!dueOn) return 'Sem prazo';
  const today = localToday();
  if (dueOn === today) return 'Hoje';
  if (dueOn === tomorrow()) return 'Amanhã';
  return dueOn.slice(0, 4) === today.slice(0, 4) ? displayDate(dueOn).slice(0, 5) : displayDate(dueOn);
}

// Linha compacta da tarefa. Informações completas e ações ficam nos detalhes.
export function taskCardHTML(task) {
  const done = task.status === 'done';
  const late = !done && task.dueOn && task.dueOn < localToday();
  return `<li class="task-card ${done ? 'task-card--done' : ''} ${PRIORITIES[task.priority] ? `task-card--${task.priority}` : ''}" data-task-id="${escapeHTML(task.id)}">
    <button type="button" class="task-open" data-task-details aria-haspopup="dialog" aria-label="Detalhes de ${escapeHTML(task.title)}. Prioridade: ${PRIORITIES[task.priority] || 'Nenhuma'}.">
      <span class="task-priority-dot task-priority-dot--${PRIORITIES[task.priority] ? task.priority : 'none'}" aria-hidden="true"></span>
      <span class="task-main"><span class="task-title" title="${escapeHTML(task.title)}">${escapeHTML(task.title)}</span>
        <span class="task-compact-meta ${late ? 'task-meta--late' : ''}">${icon('calendar')}<span>${escapeHTML(compactDueDate(task.dueOn))}</span></span>
        <span class="task-compact-meta">${icon('folder')}<span>${escapeHTML(task.space?.name || 'Sem espaço')}</span></span>
      </span>
    </button>
    <button type="button" class="task-toggle" data-task-toggle aria-pressed="${done}" aria-label="${done ? 'Reabrir' : 'Marcar como concluída'}: ${escapeHTML(task.title)}"><span>${done ? icon('check') : ''}</span></button>
  </li>`;
}

export function openTaskDetails({ task, onEdit, onDelete, onToggle, onOpenSpace }) {
  const done = task.status === 'done';
  const field = (label, value) => `<div><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`;
  const { dialog } = modal(`<h2>Detalhes da tarefa</h2>
    <h3 class="task-detail-title">${escapeHTML(task.title)}</h3>
    <p class="task-detail-description">${escapeHTML(task.description || 'Sem descrição.')}</p>
    <dl class="task-detail-fields">
      ${field('Prioridade', PRIORITIES[task.priority] || 'Sem prioridade')}${field('Prazo', displayDate(task.dueOn) || 'Sem prazo')}
      ${field('Categoria', task.space?.name || 'Sem espaço')}${field('Responsável', task.assignee || 'Sem responsável')}
      ${field('Situação', done ? 'Concluída' : 'Pendente')}${done ? field('Concluída em', displayDate(task.completedOn)) : ''}
      ${task.conversation ? field('Conversa de origem', task.conversation.fileName) : ''}
    </dl>
    <div class="task-detail-actions">
      <button type="button" class="button button--primary w-full" data-task-edit>${icon('edit')}Editar tarefa</button>
      <button type="button" class="button button--subtle w-full" data-task-complete>${icon(done ? 'sync' : 'check')}${done ? 'Reabrir tarefa' : 'Concluir tarefa'}</button>
      ${task.spaceId && onOpenSpace ? `<button type="button" class="button button--subtle w-full" data-task-space>${icon('folder')}Ver tarefas desta categoria</button>` : ''}
      <button type="button" class="button button--subtle w-full task-detail-delete" data-task-delete>${icon('trash')}Excluir tarefa</button>
    </div>`);
  dialog.querySelector('[data-task-edit]').addEventListener('click', onEdit);
  dialog.querySelector('[data-task-delete]').addEventListener('click', onDelete);
  dialog.querySelector('[data-task-complete]').addEventListener('click', event => runAction(event.currentTarget, async () => { await onToggle(); dialog.close(); }));
  dialog.querySelector('[data-task-space]')?.addEventListener('click', () => { dialog.close(); onOpenSpace(); });
}

/** Valores de uma tarefa da API para o formulário. */
export const taskFormValues = task => ({
  title: task.title, description: task.description || '', assignee: task.assignee || '',
  dueOn: task.dueOn || '', priority: task.priority || '', spaceId: task.spaceId || '',
});

// Formulário usado pelas propostas do chat e pela tela Tarefas. Resolve por onSubmit com os valores editados,
// em que o espaço é { spaceId } (existente ou nenhum) ou { spaceName } (a criar).
export function openTaskEditor({ heading, values = {}, spaces = [], completedOnly = false, submitLabel, onSubmit }) {
  const fields = completedOnly
    ? `<label class="dialog-field-label" for="task-completed">Concluída em</label><input class="app-input" id="task-completed" name="completedOn" type="date" required>`
    : `<label class="dialog-field-label" for="task-title">Título</label><input class="app-input" id="task-title" name="title" type="text" maxlength="160" required autofocus>
      <label class="dialog-field-label" for="task-description">Descrição</label><textarea class="app-input app-textarea" id="task-description" name="description" maxlength="2000" rows="3"></textarea>
      <label class="dialog-field-label" for="task-space">Espaço</label><select class="app-input" id="task-space" name="space"><option value="">Sem espaço</option>${spaces.map(space => `<option value="${escapeHTML(space.id)}">${escapeHTML(space.name)}</option>`).join('')}<option value="${NEW_SPACE}">+ Criar novo espaço…</option></select>
      <div class="new-space-field" hidden><label class="dialog-field-label" for="task-new-space">Nome do novo espaço</label><input class="app-input" id="task-new-space" name="newSpace" type="text" maxlength="40"></div>
      <label class="dialog-field-label" for="task-priority">Prioridade</label><div class="priority-select"><span class="priority-swatch" aria-hidden="true"></span><select class="app-input" id="task-priority" name="priority">${[['', 'Nenhuma'], ...Object.entries(PRIORITIES)].map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></div>
      <label class="dialog-field-label" for="task-assignee">Responsável</label><input class="app-input" id="task-assignee" name="assignee" type="text" maxlength="80">
      <label class="dialog-field-label" for="task-due">Prazo</label><input class="app-input" id="task-due" name="dueOn" type="date">`;
  const { dialog } = modal(`<h2>${escapeHTML(heading)}</h2><form novalidate class="task-form">${fields}${dialogError()}<button class="button button--primary w-full" type="submit">${escapeHTML(submitLabel)}</button></form>`,
    async (data, dialog) => {
      const { space, newSpace, ...edited } = Object.fromEntries(data);
      if (!completedOnly && !String(edited.title || '').trim()) throw new AppError('Informe o título da tarefa.');
      if (space === NEW_SPACE) {
        if (!newSpace.trim()) throw new AppError('Informe o nome do novo espaço.');
        edited.spaceName = newSpace;
      } else if (space !== undefined) {
        edited.spaceId = space;
      }
      await onSubmit(edited);
      dialog.close();
    });
  const { spaceId, spaceName, priority = '', ...initial } = values;
  for (const [name, value] of Object.entries(initial)) {
    const field = dialog.querySelector(`[name="${name}"]`);
    if (field) field.value = value || '';
  }
  const prioritySelect = dialog.querySelector('#task-priority');
  if (prioritySelect) {
    // A amostra ao lado do menu mostra a cor da prioridade escolhida.
    const showColour = () => { prioritySelect.parentElement.dataset.priority = prioritySelect.value; };
    prioritySelect.value = PRIORITIES[priority] ? priority : '';
    showColour();
    prioritySelect.addEventListener('change', showColour);
  }
  const select = dialog.querySelector('#task-space');
  if (!select) return;
  const newField = dialog.querySelector('.new-space-field');
  const showNew = () => { newField.hidden = select.value !== NEW_SPACE; };
  const existing = spaceName ? spaces.find(space => space.nameKey === spaceKey(spaceName)) : null;
  select.value = (spaceId && spaces.some(space => space.id === spaceId) ? spaceId : '') || existing?.id || (spaceName ? NEW_SPACE : '');
  if (select.value === NEW_SPACE) dialog.querySelector('#task-new-space').value = spaceName;
  showNew();
  select.addEventListener('change', () => {
    showNew();
    if (!newField.hidden) dialog.querySelector('#task-new-space').focus();
  });
}

// Nome do espaço ao criar ou renomear; na criação, oferece os atalhos que a API indica como livres.
export function openSpaceForm({ heading, value = '', submitLabel, onSubmit, suggestions = [] }) {
  const { dialog } = modal(`<h2>${escapeHTML(heading)}</h2><form novalidate>
    <label class="dialog-field-label" for="space-name">Nome do espaço</label><input class="app-input" id="space-name" name="name" type="text" maxlength="40" required autofocus>
    ${suggestions.length ? `<div class="space-suggestions">${suggestions.map(name => `<button type="button" class="space-chip" data-space-suggestion="${escapeHTML(name)}">${escapeHTML(name)}</button>`).join('')}</div>` : ''}
    ${dialogError()}<button class="button button--primary w-full" type="submit">${escapeHTML(submitLabel)}</button></form>`,
    async (data, dialog) => {
      if (!String(data.get('name') || '').trim()) throw new AppError('Informe o nome do espaço.');
      await onSubmit(data.get('name'));
      dialog.close();
    });
  const input = dialog.querySelector('#space-name');
  input.value = value;
  dialog.querySelectorAll('[data-space-suggestion]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.spaceSuggestion; input.focus(); }));
}
