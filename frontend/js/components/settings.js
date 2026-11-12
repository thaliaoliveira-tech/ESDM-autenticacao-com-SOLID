import { icon, escapeHTML, modal, runAction, showToast } from './app-ui.js';
import { prepareNotifications } from '../services/reminders.js';
import { validReminderTime } from '../api/settings.js';
import { AppError } from '../utils/helpers.js';
import { accountLabel } from './sidebar.js';

const THEME_LABELS = [['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Escuro']];

export function openSettings({ ai, theme, reminder, timezone, onReminder, onTheme, onLogout }) {
  const { dialog } = modal(`<h2>Configurações</h2>
    <section class="settings-section"><h3 id="theme-title">Aparência</h3>
      <div class="theme-options" role="radiogroup" aria-labelledby="theme-title">${THEME_LABELS.map(([value, label]) => `<label class="theme-option"><input type="radio" name="theme" value="${value}" ${value === theme ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div>
    </section>
    <section class="settings-section"><h3>Lembrete diário</h3>
      <label class="reminder-toggle"><input id="reminder-enabled" type="checkbox" ${reminder.enabled ? 'checked' : ''}> Lembrar das tarefas de hoje</label>
      <label class="dialog-field-label" for="reminder-time">Horário do lembrete</label>
      <input class="app-input" id="reminder-time" type="time" value="${escapeHTML(reminder.time)}" aria-describedby="reminder-help" required>
      <p class="reminder-help" id="reminder-help">Horário no fuso ${escapeHTML(timezone || 'deste dispositivo')}. O servidor gera o aviso e o app o mostra enquanto estiver aberto; se o horário passar, o aviso aparece ao voltar ao app. Avisos do sistema dependem da sua permissão; sem ela, o lembrete aparece no app.</p>
      <button class="button button--primary w-full" id="save-reminder" type="button">${icon('bell')}Salvar lembrete</button>
      <p class="reminder-status" id="reminder-status" role="status" aria-live="polite"></p>
    </section>
    <section class="settings-section"><h3>Inteligência artificial</h3><p class="settings-ai"><span class="online-dot ${ai.configured ? '' : 'online-dot--off'}"></span><span>${ai.configured ? `Conectada: ${escapeHTML(ai.model)} via OpenRouter` : 'Não configurada. Defina OPENROUTER_API_KEY no .env do backend e reinicie a API.'}</span></p></section>
    <button class="button button--subtle w-full settings-logout" id="settings-logout" type="button">${icon('logout')}Sair</button>`);
  dialog.querySelectorAll('[name="theme"]').forEach(input => input.addEventListener('change', () => {
    onTheme(input.value).catch(error => showToast(error.message || 'Não foi possível salvar o tema.', 'error'));
  }));
  dialog.querySelector('#save-reminder').addEventListener('click', event => runAction(event.currentTarget, async () => {
    const enabled = dialog.querySelector('#reminder-enabled').checked;
    const time = dialog.querySelector('#reminder-time').value;
    if (!validReminderTime(time)) throw new AppError('Escolha um horário válido para o lembrete.');
    const permission = enabled ? await prepareNotifications() : null;
    await onReminder({ enabled, time });
    const message = !enabled ? 'Lembrete diário desativado.' : permission === 'granted' ? `Lembrete diário salvo para ${time}.` : `Lembrete salvo para ${time}. Os avisos aparecerão dentro do app; notificações do sistema indisponíveis ou bloqueadas.`;
    dialog.querySelector('#reminder-status').textContent = message;
    showToast(message);
  }));
  dialog.querySelector('#settings-logout').addEventListener('click', event => runAction(event.currentTarget, onLogout));
}

export function openUserProfile({ session, onLogout }) {
  const account = accountLabel(session);
  const provider = session.account ? 'E-mail e senha' : 'Convidado';
  const { dialog } = modal(`<h2>Perfil de usuário</h2>
    <div class="profile-avatar" aria-hidden="true">${escapeHTML(account.name.charAt(0).toUpperCase())}</div>
    <p class="settings-account"><strong>${escapeHTML(account.name)}</strong><span>${escapeHTML(account.detail)}</span></p>
    <section class="settings-section"><h3>Forma de acesso</h3><p>${escapeHTML(provider)}</p></section>
    <p class="profile-note">${session.account ? 'Seu perfil e suas tarefas ficam salvos no servidor do Sintetiza.' : 'Você pode criar tarefas e organizar seus espaços sem cadastrar uma conta. Convidados sem sessão ativa são removidos após 30 dias.'}</p>
    <button class="button button--subtle w-full settings-logout" id="profile-logout" type="button">${icon('logout')}Sair</button>`);
  dialog.querySelector('#profile-logout').addEventListener('click', event => runAction(event.currentTarget, onLogout));
}

export function accountViewHTML(session) {
  const account = accountLabel(session);
  return `<section class="account-summary"><span class="profile-avatar" aria-hidden="true">${escapeHTML(account.name.charAt(0).toUpperCase())}</span><h2>${escapeHTML(account.name)}</h2><p>${escapeHTML(account.detail)}</p></section>
    <div class="account-options">
      <button type="button" class="account-option" data-account-action="profile" aria-haspopup="dialog">${icon('user')}<span><strong>Perfil de usuário</strong><small>Seus dados e forma de acesso</small></span>${icon('chevron')}</button>
      <button type="button" class="account-option" data-account-action="settings" aria-haspopup="dialog">${icon('settings')}<span><strong>Configurações</strong><small>Aparência, lembretes e inteligência artificial</small></span>${icon('chevron')}</button>
    </div><button class="button button--subtle w-full account-logout" id="account-logout" type="button">${icon('logout')}Sair</button>`;
}
