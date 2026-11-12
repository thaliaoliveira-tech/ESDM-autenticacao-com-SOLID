import { request, readSession, saveSession, clearSession } from './client.js';
import { AppError, validateEmail, validatePassword, validateUsername } from '../utils/helpers.js';

const LAST_EMAIL = 'sintetiza.lastEmail';

export function lastEmail() {
  try { return localStorage.getItem(LAST_EMAIL) || ''; } catch { return ''; }
}
function rememberEmail(email) {
  try {
    if (email) localStorage.setItem(LAST_EMAIL, email);
    else localStorage.removeItem(LAST_EMAIL);
  } catch { /* armazenamento indisponível */ }
}

/** Sessão para a interface: { kind: 'member' | 'guest', account }. */
function toSession(account) {
  return {
    kind: account.isGuest ? 'guest' : 'member',
    account: account.isGuest ? null : {
      id: account.id, name: account.name, username: account.username, email: account.email, provider: 'email',
    },
  };
}

/** Recupera a sessão guardada, validando-a na API. Sem sessão válida, devolve null. */
export async function getSession() {
  if (!readSession()) return null;
  try {
    return toSession(await request('/account'));
  } catch (error) {
    if (error.status === 401) { clearSession(); return null; }
    throw error;
  }
}

async function open(auth) {
  saveSession(auth);
  const session = await getSession();
  if (session?.account?.email) rememberEmail(session.account.email);
  return session;
}

export async function createAccount(usernameValue, emailValue, password, confirmPassword) {
  const username = validateUsername(usernameValue);
  const email = validateEmail(emailValue);
  validatePassword(password, confirmPassword);
  return open(await request('/auth/register', { method: 'POST', auth: false, body: { username, email, password, confirmPassword } }));
}

export async function login(emailValue, password) {
  const email = validateEmail(emailValue);
  if (!password) throw new AppError('Informe sua senha.', 'password');
  return open(await request('/auth/login', { method: 'POST', auth: false, body: { email, password } }));
}

export async function continueAsGuest() {
  // Uma sessão de convidado já aberta é reaproveitada, com as mesmas tarefas.
  const current = await getSession().catch(() => null);
  if (current?.kind === 'guest') return current;
  if (current) await logout();
  return open(await request('/auth/guest', { method: 'POST', auth: false }));
}

export async function logout() {
  try {
    if (readSession()) await request('/auth/logout', { method: 'POST' });
  } catch { /* a sessão já pode ter expirado no servidor */ }
  finally { clearSession(); }
}

/** A API não envia e-mail: o token volta na resposta e o link é montado aqui. */
export async function requestPasswordReset(emailValue) {
  const email = validateEmail(emailValue);
  const result = await request('/auth/password/forgot', { method: 'POST', auth: false, body: { email } });
  return { ...result, link: `/tela-2.html?reset=${encodeURIComponent(result.resetToken)}` };
}

export async function resetPassword(token, password, confirmPassword) {
  validatePassword(password, confirmPassword);
  try {
    await request('/auth/password/reset', { method: 'POST', auth: false, body: { token, password, confirmPassword } });
  } catch (error) {
    // O link não tem campo no formulário: mostra como erro geral.
    if (error.field === 'token') error.field = '';
    throw error;
  }
  // A redefinição encerra as sessões da conta no servidor.
  clearSession();
}

export async function updateAccountEmail(emailValue) {
  const email = validateEmail(emailValue);
  const account = await request('/account', { method: 'PATCH', body: { email } });
  rememberEmail(account.email);
  return toSession(account);
}

export async function deleteAccount() {
  await request('/account', { method: 'DELETE' });
  clearSession();
  rememberEmail('');
}
