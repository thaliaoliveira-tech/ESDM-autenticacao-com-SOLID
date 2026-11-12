import { listTasks, updateTask, setTaskDone, deleteTask } from '../api/tasks.js';
import { taskCardHTML, taskFormValues, openTaskEditor, openTaskDetails } from '../components/task-ui.js';
import { icon, escapeHTML, modal, dialogError, runAction, showToast } from '../components/app-ui.js';
import { debounce, friendlyError } from '../utils/helpers.js';

const FILTERS = [['pending', 'Pendentes'], ['done', 'Concluídas'], ['all', 'Todas']];
const SORTS = [['created', 'Data de criação'], ['due', 'Data de entrega']];
const ALL = 'all';
const PERIODS = [['today', 'Hoje'], ['tomorrow', 'Amanhã'], ['week', 'Esta semana'], ['tasks', 'Todas']];

// A tela Tarefas: período, situação, espaço, busca e ordenação são aplicados pela API
// (GET /tasks); os contadores dos filtros vêm de `meta.counts`.
export function createTasksView({ container, getSpaces, hasTasks, onChange, onOpenSpace, onOpenPeriod }) {
  let filter = 'pending';
  let spaceFilter = ALL;
  let sort = 'created';
  let todayOnly = false;
  let period = 'all';
  let query = '';
  let tasks = [];
  let counts = { pending: 0, done: 0, all: 0 };
  let loaded = false;
  let error = null;
  let sequence = 0;

  async function load() {
    const current = ++sequence;
    try {
      const result = await listTasks({
        period, status: filter, q: query,
        spaceId: spaceFilter === ALL ? undefined : spaceFilter,
        sort: todayOnly ? 'created' : sort,
      });
      if (current !== sequence) return;
      tasks = result.data;
      counts = result.meta?.counts || counts;
      error = null;
    } catch (failure) {
      if (current !== sequence) return;
      error = failure;
    }
    loaded = true;
    draw();
  }

  const reloadSearch = debounce(() => load());

  function draw() {
    const focusedSearch = document.activeElement?.id === 'task-search';
    const cursor = focusedSearch ? document.activeElement.selectionStart : null;
    const anyTask = hasTasks() || tasks.length > 0;
    const list = `<ul class="task-list">${tasks.map(taskCardHTML).join('')}</ul>`;
    const intro = todayOnly ? `<section class="today-welcome" aria-labelledby="today-heading">
      <h2 id="today-heading">O que você precisa fazer hoje?</h2>
      </section>` : '';
    const summary = todayOnly ? `<div class="today-overview" aria-label="Resumo das tarefas com prazo hoje"><div><strong>${counts.pending}</strong><span>para fazer</span></div><div><strong>${counts.done}</strong><span>concluídas</span></div></div>` : '';
    const empty = error ? friendlyError(error)
      : !loaded ? 'Carregando tarefas…'
      : query.trim() ? 'Nenhuma tarefa encontrada neste filtro. Tente outro termo.'
      : todayOnly ? 'Nenhuma tarefa para hoje neste filtro.'
      : anyTask ? 'Nenhuma tarefa neste filtro.' : 'Nenhuma tarefa ainda. Use o + do rodapé para criar uma.';
    const tabs = spaceFilter === ALL ? `<div class="task-section-tabs" role="group" aria-label="Filtrar tarefas por período">${PERIODS.map(([value, label]) => `<button type="button" data-task-section="${value}" aria-pressed="${period === (value === 'tasks' ? 'all' : value)}">${label}</button>`).join('')}</div>` : '';
    container.innerHTML = `${intro}${summary}${tabs}
      ${anyTask || query ? `<div class="tasks-toolbar">
        <label class="search-field task-search">${icon('search')}<span class="sr-only">Buscar tarefas por título, descrição, responsável ou categoria</span><input id="task-search" type="search" placeholder="Buscar tarefas" value="${escapeHTML(query)}" autocomplete="off" aria-controls="task-results"></label>
        <div class="task-filters" role="group" aria-label="Filtrar por situação">${FILTERS.map(([value, label]) => `<button type="button" class="task-filter" data-filter="${value}" aria-pressed="${filter === value}">${label} <span>${counts[value] ?? 0}</span></button>`).join('')}</div>
        ${todayOnly ? '' : `<div class="task-sort" role="group" aria-label="Ordenar tarefas"><span>Ordenar por</span>${SORTS.map(([value, label]) => `<button type="button" class="task-sort-option" data-sort="${value}" aria-pressed="${sort === value}">${label}</button>`).join('')}</div>`}
      </div>` : ''}
      ${query.trim() && loaded && !error ? `<p class="search-count" role="status" aria-live="polite">${tasks.length} ${tasks.length === 1 ? 'tarefa encontrada' : 'tarefas encontradas'}</p>` : ''}
      <div id="task-results" aria-busy="${!loaded}">${tasks.length ? list : `<div class="tasks-empty-state"><p class="tasks-empty" ${error ? 'role="alert"' : ''}>${escapeHTML(empty)}</p></div>`}</div>`;
    bind();
    if (focusedSearch) {
      const input = container.querySelector('#task-search');
      input.focus({ preventScroll: true });
      if (cursor !== null) input.setSelectionRange(cursor, cursor);
    }
  }

  function bind() {
    container.querySelectorAll('[data-task-section]').forEach(button => button.addEventListener('click', () => onOpenPeriod(button.dataset.taskSection)));
    container.querySelector('#task-search')?.addEventListener('input', event => { query = event.target.value; reloadSearch(); });
    container.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; load(); }));
    container.querySelectorAll('[data-sort]').forEach(button => button.addEventListener('click', () => { sort = button.dataset.sort; load(); }));
    container.querySelectorAll('[data-task-id]').forEach(card => {
      const task = tasks.find(record => record.id === card.dataset.taskId);
      const toggle = async () => {
        await setTaskDone(task.id, task.status !== 'done');
        await onChange();
        showToast(task.status === 'done' ? 'Tarefa reaberta.' : 'Tarefa concluída hoje.');
      };
      card.querySelector('[data-task-toggle]').addEventListener('click', event => runAction(event.currentTarget, toggle));
      const edit = () => openTaskEditor({
        heading: 'Editar tarefa', submitLabel: 'Salvar alterações', spaces: getSpaces(), values: taskFormValues(task),
        onSubmit: async values => { await updateTask(task.id, values); await onChange(); showToast('Tarefa atualizada.'); },
      });
      const remove = () => {
        const { dialog } = modal(`<h2>Excluir esta tarefa?</h2><p class="session-email">${escapeHTML(task.title)}</p><p class="danger-note">A tarefa será removida da sua conta.</p><form>${dialogError()}<button class="button button--danger w-full" type="submit">Excluir tarefa</button><button class="button button--subtle w-full" id="cancel-delete-task" type="button">Cancelar</button></form>`,
          async (_data, dialog) => { await deleteTask(task.id); dialog.close(); await onChange(); showToast('Tarefa excluída.'); }, 'Excluindo…');
        dialog.querySelector('#cancel-delete-task').addEventListener('click', () => dialog.close());
      };
      card.querySelector('[data-task-details]').addEventListener('click', () => openTaskDetails({
        task, onEdit: edit, onDelete: remove, onToggle: toggle,
        onOpenSpace: () => onOpenSpace(task.spaceId),
      }));
    });
  }

  // Mostra um único espaço, começando nas pendentes; o cabeçalho oferece o caminho de volta.
  function showSpace(id) {
    query = '';
    spaceFilter = id;
    filter = 'pending';
    container.scrollTop = 0;
  }

  function clearSpace() { spaceFilter = ALL; }

  function setPeriod(value) {
    if (period !== value) { filter = 'pending'; query = ''; loaded = false; tasks = []; }
    period = value;
    todayOnly = value === 'today';
    if (value !== 'all') clearSpace();
  }

  // Desenha o que já tem e busca a lista atualizada.
  function render() {
    draw();
    return load();
  }

  return { render, showSpace, clearSpace, setPeriod, counts: () => counts };
}
