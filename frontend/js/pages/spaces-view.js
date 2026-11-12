import { listSpaces, spaceSuggestions, createSpace, renameSpace, deleteSpace } from '../api/spaces.js';
import { openSpaceForm } from '../components/task-ui.js';
import { icon, escapeHTML, modal, dialogError, showToast } from '../components/app-ui.js';
import { debounce, friendlyError } from '../utils/helpers.js';

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

// A tela Espaços: as categorias com seus contadores, vindos de GET /spaces
// (`meta.unassigned` e `meta.showUnassigned` cuidam de "Sem espaço").
export function createSpacesView({ container, onChange, onOpenSpace }) {
  let query = '';
  let spaces = [];
  let meta = null;
  let loaded = false;
  let error = null;
  let sequence = 0;

  async function load() {
    const current = ++sequence;
    try {
      const result = await listSpaces(query);
      if (current !== sequence) return;
      spaces = result.data;
      meta = result.meta;
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
    const focused = document.activeElement?.id === 'space-search';
    const cursor = focused ? document.activeElement.selectionStart : null;
    const card = (id, name, counts, editable) => `<li class="space-card" data-space-id="${escapeHTML(id)}">
        <button type="button" class="space-open" data-open-space aria-label="Ver tarefas de ${escapeHTML(name)}">
          <span class="space-icon">${icon('folder')}</span>
          <span class="space-info"><strong>${escapeHTML(name)}</strong><small>${plural(counts.pending, 'pendente', 'pendentes')} · ${plural(counts.done, 'concluída', 'concluídas')}</small></span>
          ${icon('chevron', 'space-chevron')}
        </button>
        ${editable ? `<div class="task-actions"><button type="button" class="action-button" data-rename-space>${icon('edit')}Renomear</button><button type="button" class="action-button action-button--danger" data-delete-space>${icon('trash')}Excluir</button></div>` : ''}
      </li>`;
    const showUnassigned = Boolean(meta?.showUnassigned);
    const resultCount = spaces.length + Number(showUnassigned);
    const empty = error ? friendlyError(error) : !loaded ? 'Carregando espaços…'
      : query.trim() ? 'Nenhum espaço encontrado. Tente outro termo.' : 'Nenhum espaço ainda. Crie o primeiro para organizar suas tarefas.';
    container.innerHTML = `<p class="spaces-intro">Agrupe as tarefas por categoria, como Trabalho, Faculdade ou Pessoal.</p>
      <button type="button" class="button button--primary tasks-new" id="spaces-new">Novo espaço</button>
      <label class="search-field space-search">${icon('search')}<span class="sr-only">Buscar espaços pelo nome</span><input id="space-search" type="search" placeholder="Buscar espaços" value="${escapeHTML(query)}" autocomplete="off" aria-controls="space-results"></label>
      ${query.trim() && loaded && !error ? `<p class="search-count" role="status" aria-live="polite">${resultCount} ${resultCount === 1 ? 'espaço encontrado' : 'espaços encontrados'}</p>` : ''}
      <div id="space-results">${resultCount ? `<ul class="space-list">${spaces.map(space => card(space.id, space.name, space.counts, true)).join('')}${showUnassigned ? card('none', 'Sem espaço', meta.unassigned, false) : ''}</ul>`
        : `<p class="tasks-empty" ${error ? 'role="alert"' : ''}>${escapeHTML(empty)}</p>`}</div>`;
    bind();
    if (focused) {
      const input = container.querySelector('#space-search');
      input.focus({ preventScroll: true });
      if (cursor !== null) input.setSelectionRange(cursor, cursor);
    }
  }

  function bind() {
    container.querySelector('#space-search').addEventListener('input', event => { query = event.target.value; reloadSearch(); });
    container.querySelector('#spaces-new').addEventListener('click', async () => {
      const suggestions = await spaceSuggestions().catch(() => []);
      openSpaceForm({
        heading: 'Novo espaço', submitLabel: 'Criar espaço', suggestions,
        onSubmit: async name => { await createSpace(name); await onChange(); showToast('Espaço criado.'); },
      });
    });
    container.querySelectorAll('[data-space-id]').forEach(card => {
      const id = card.dataset.spaceId;
      const space = spaces.find(record => record.id === id);
      card.querySelector('[data-open-space]').addEventListener('click', () => onOpenSpace(id));
      card.querySelector('[data-rename-space]')?.addEventListener('click', () => openSpaceForm({
        heading: 'Renomear espaço', value: space.name, submitLabel: 'Salvar',
        onSubmit: async name => { await renameSpace(space.id, name); await onChange(); showToast('Espaço renomeado.'); },
      }));
      card.querySelector('[data-delete-space]')?.addEventListener('click', () => {
        const count = space.counts.total ?? space.counts.pending + space.counts.done;
        const { dialog } = modal(`<h2>Excluir este espaço?</h2><p class="session-email">${escapeHTML(space.name)}</p><p class="danger-note">${count ? `${plural(count, 'tarefa continua salva', 'tarefas continuam salvas')}, sem espaço.` : 'O espaço não tem tarefas.'}</p><form>${dialogError()}<button class="button button--danger w-full" type="submit">Excluir espaço</button><button class="button button--subtle w-full" id="cancel-delete-space" type="button">Cancelar</button></form>`,
          async (_data, dialog) => { await deleteSpace(space.id); dialog.close(); await onChange(); showToast('Espaço excluído.'); }, 'Excluindo…');
        dialog.querySelector('#cancel-delete-space').addEventListener('click', () => dialog.close());
      });
    });
  }

  function render() {
    draw();
    return load();
  }

  return { render };
}
