import { getSession, lastEmail } from './api/auth.js';
import { mountSharedComponents, showSession, showToast, openResetFromLink } from './components/ui.js';
import { initHome } from './pages/tela-1.js';
import { initLogin } from './pages/tela-2.js';
import { initRegister } from './pages/tela-3.js';
import { friendlyError } from './utils/helpers.js';

async function start() {
  mountSharedComponents();
  const page = document.body.dataset.page;
  const main = document.querySelector('main');
  const controls = [...main.querySelectorAll('button')];
  main.setAttribute('aria-busy', 'true');
  controls.forEach(button => { button.disabled = true; });
  let session = null;
  try {
    session = await getSession();
  } catch (error) {
    // Sem API, as telas continuam abertas e cada ação explica o problema.
    showToast(friendlyError(error), 'error');
  }
  const state = { session, lastEmail: lastEmail() };
  if (page === 'home') initHome(state);
  if (page === 'login') initLogin(state);
  if (page === 'register') initRegister(state);
  controls.forEach(button => { button.disabled = false; });
  main.setAttribute('aria-busy', 'false');
  document.documentElement.dataset.ready = 'true';
  const resetToken = new URLSearchParams(location.search).get('reset');
  if (page === 'login' && resetToken !== null) openResetFromLink(resetToken);
  else if (session) showSession(session, 'Sua sessão foi recuperada');
}

start().catch(error => showToast(friendlyError(error), 'error'));
