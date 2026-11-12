import { getSession } from './api/auth.js';
import { setSessionLostHandler } from './api/client.js';
import { getSettings, syncTimezone } from './api/settings.js';
import { mountSharedComponents } from './components/ui.js';
import { applyTheme } from './components/app-ui.js';
import { friendlyError } from './utils/helpers.js';
import { initInicio } from './pages/inicio.js';

const DEFAULT_SETTINGS = { theme: 'system', timezone: '', dailyReminder: { enabled: false, time: '09:00' } };

async function start() {
  mountSharedComponents();
  // Sessão encerrada no servidor (logout em outra aba, senha redefinida, refresh expirado): volta ao acesso.
  setSessionLostHandler(() => location.replace('/index.html'));
  const session = await getSession();
  if (!session) {
    location.replace('/index.html');
    return;
  }
  const settings = await syncTimezone(await getSettings().catch(() => DEFAULT_SETTINGS));
  applyTheme(settings.theme);
  const view = document.getElementById('app-view');
  await initInicio({ session, view, settings });
  view.setAttribute('aria-busy', 'false');
  document.documentElement.dataset.ready = 'true';
}

start().catch(error => {
  const view = document.getElementById('app-view');
  const message = document.createElement('p');
  message.className = 'app-boot-error'; message.setAttribute('role', 'alert'); message.textContent = friendlyError(error);
  const link = document.createElement('a'); link.className = 'button button--primary w-full'; link.href = '/index.html'; link.textContent = 'Voltar ao acesso';
  view.replaceChildren(message, link); view.setAttribute('aria-busy', 'false');
  document.documentElement.dataset.ready = 'error';
});
