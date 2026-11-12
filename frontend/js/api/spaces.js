import { request, listAll } from './client.js';
import { spaceKey } from '../utils/helpers.js';

const withKey = space => ({ ...space, nameKey: spaceKey(space.name) });

/** Espaços em ordem de criação, com contadores; `meta.unassigned` e `meta.showUnassigned` cobrem "Sem espaço". */
export async function listSpaces(q = '') {
  const { data, meta } = await listAll('/spaces', { q: q.trim() || undefined });
  return { data: data.map(withKey), meta };
}

export const spaceSuggestions = async () => (await request('/spaces/suggestions')).data;
export const createSpace = name => request('/spaces', { method: 'POST', body: { name } });
export const renameSpace = (id, name) => request(`/spaces/${encodeURIComponent(id)}`, { method: 'PATCH', body: { name } });
export const deleteSpace = id => request(`/spaces/${encodeURIComponent(id)}`, { method: 'DELETE' });
