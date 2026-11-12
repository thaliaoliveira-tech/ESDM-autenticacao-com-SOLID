import { AppError } from '../utils/helpers.js';

// Em desenvolvimento o Vite repassa /api para a API NestJS (vite.config.js).
const API_URL = String(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const SESSION_KEY = 'sintetiza.session';
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

// Nomes de campo da API -> ids dos campos nos formulários.
const FIELD_ALIASES = { confirmPassword: 'confirm-password' };

export class ApiError extends AppError {
  constructor(message, { status = 0, field = '', code = '' } = {}) {
    super(message, FIELD_ALIASES[field] || field || '');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------- tokens

export function readSession() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY));
    return value?.accessToken && value?.refreshToken ? value : null;
  } catch {
    return null;
  }
}

export function saveSession(auth) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    user: auth.user,
  }));
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* armazenamento indisponível */ }
}

let onSessionLost = () => {};
/** Chamado quando a sessão expira de vez (refresh recusado). */
export function setSessionLostHandler(handler) { onSessionLost = handler; }

let refreshing = null;
async function refreshTokens(failedToken) {
  // Outra aba pode já ter renovado: o localStorage é compartilhado.
  const current = readSession();
  if (current && current.accessToken !== failedToken) return true;
  if (!current) return false;
  refreshing ||= (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!response.ok) {
        // Pode ter perdido a corrida para outra aba, que já gravou o novo par.
        const latest = readSession();
        if (latest && latest.refreshToken !== current.refreshToken) return true;
        clearSession();
        return false;
      }
      saveSession(await response.json());
      return true;
    } catch {
      return false;
    }
  })().finally(() => { refreshing = null; });
  return refreshing;
}

// --------------------------------------------------------------- requests

function buildUrl(path, query) {
  const url = new URL(`${API_URL}${path}`, location.origin);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function toApiError(response) {
  let body = null;
  try { body = await response.json(); } catch { /* corpo sem JSON */ }
  const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
  const fallback = {
    401: 'Sua sessão expirou. Entre novamente.',
    403: 'Você não tem permissão para fazer isso.',
    404: 'Não encontramos esse item. Ele pode ter sido excluído.',
    413: 'Use um arquivo de até 10 MB.',
    429: 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.',
    502: 'A IA não respondeu. Tente novamente.',
    503: 'O serviço está indisponível no momento.',
  }[response.status];
  return new ApiError(message || fallback || `Erro ${response.status} ao falar com o servidor.`, {
    status: response.status, field: body?.field, code: body?.error,
  });
}

/**
 * Chamada à API. Envia o access token, renova a sessão uma vez em 401 e
 * converte erros no formato ErrorResponse em ApiError (com `field`).
 * `raw: true` devolve a Response (usado pelo streaming do chat).
 */
export async function request(path, { method = 'GET', body, query, auth = true, signal, headers = {}, raw = false } = {}) {
  const send = async () => {
    const session = auth ? readSession() : null;
    const init = { method, signal, headers: { Accept: 'application/json', ...headers } };
    if (session) init.headers.Authorization = `Bearer ${session.accessToken}`;
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    return { response: await fetch(buildUrl(path, query), init), token: session?.accessToken };
  };

  let result;
  try {
    result = await send();
    if (auth && result.response.status === 401 && result.token) {
      if (await refreshTokens(result.token)) result = await send();
      else {
        onSessionLost();
        throw new ApiError('Sua sessão expirou. Entre novamente.', { status: 401, code: 'SessionExpiredError' });
      }
    }
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof ApiError) throw error;
    throw new ApiError('Não foi possível falar com o servidor do Sintetiza. Confira se a API está rodando.', { code: 'NetworkError' });
  }

  const { response } = result;
  if (!response.ok) throw await toApiError(response);
  if (raw) return response;
  if (response.status === 204) return null;
  const type = response.headers.get('Content-Type') || '';
  return type.includes('application/json') ? response.json() : response.text();
}

/** Percorre todas as páginas de uma listagem `{ data, meta }`. */
export async function listAll(path, query = {}) {
  const first = await request(path, { query: { ...query, page: 1, pageSize: PAGE_SIZE } });
  const data = [...first.data];
  const pages = Math.min(first.meta?.totalPages || 1, MAX_PAGES);
  for (let page = 2; page <= pages; page++) {
    const next = await request(path, { query: { ...query, page, pageSize: PAGE_SIZE } });
    data.push(...next.data);
  }
  return { data, meta: first.meta };
}

/**
 * Lê um fluxo SSE da API (`event: <tipo>` / `data: <json>`).
 * Eventos: user_message, delta, assistant_message, error, done.
 */
export async function stream(path, body, { signal, onEvent }) {
  const response = await request(path, {
    method: 'POST', body, query: { stream: true }, signal, raw: true,
    headers: { Accept: 'text/event-stream' },
  });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const handle = block => {
    const data = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!data) return false;
    const event = JSON.parse(data);
    if (event.type === 'error') {
      throw new ApiError(event.message || 'Não foi possível obter a resposta da IA.', { status: event.statusCode, field: event.field, code: event.error });
    }
    onEvent(event);
    return event.type === 'done';
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n?/g, '\n');
    let end;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (handle(block)) { reader.cancel().catch(() => {}); return; }
    }
  }
  if (buffer.trim()) handle(buffer);
}
