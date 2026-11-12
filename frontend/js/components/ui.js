import { AppError, friendlyError } from '../utils/helpers.js';
import { requestPasswordReset, resetPassword, updateAccountEmail, deleteAccount, logout, lastEmail } from '../api/auth.js';

const iconPath = '/assets/icons/ui.svg';
let toastTimer;
let dialogNumber = 0;

export const icon = (name, className = '') => `<svg class="${className}" aria-hidden="true"><use href="${iconPath}#${name}"></use></svg>`;

export function mountSharedComponents() {
  document.querySelector('[data-status-bar]').innerHTML = `
    <span class="status-time">9:41</span>
    <span class="status-icons flex items-center">${icon('signal')}${icon('wifi')}${icon('battery')}</span>`;
  bindPasswordToggles(document);
}

export function bindPasswordToggles(root) {
  root.querySelectorAll('[data-toggle-password]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.togglePassword);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(show));
      const description = input.name === 'confirmPassword' ? 'confirmação de senha' : 'senha';
      button.setAttribute('aria-label', `${show ? 'Ocultar' : 'Mostrar'} ${description}`);
      button.querySelector('use').setAttribute('href', `${iconPath}#${show ? 'eye-off' : 'eye'}`);
    });
  });
}

export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast toast--${type}`;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
}

export function setBusy(element, busy, loadingLabel = 'Salvando…') {
  element.setAttribute('aria-busy', String(busy));
  const controls = element.matches('button') ? [element] : [...element.querySelectorAll('button, input, select, textarea')];
  controls.forEach(control => {
    if (busy) {
      control.dataset.wasDisabled = String(control.disabled);
      control.disabled = true;
    } else {
      control.disabled = control.dataset.wasDisabled === 'true';
      delete control.dataset.wasDisabled;
    }
  });
  const submit = element.matches('button') ? element : element.querySelector('[type="submit"]');
  if (submit) {
    if (busy) { submit.dataset.originalLabel = submit.textContent; submit.textContent = loadingLabel; }
    else { submit.textContent = submit.dataset.originalLabel || submit.textContent; delete submit.dataset.originalLabel; }
  }
}

export function clearErrors(form) {
  form.querySelectorAll('.field-error, .form-error').forEach(error => { error.hidden = true; error.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
}

// `error.field` vem da validação local ou do campo `field` do ErrorResponse da API.
export function showFormError(form, error) {
  const input = error instanceof AppError && error.field
    ? [...form.querySelectorAll('input')].find(field => field.id === error.field || field.dataset.field === error.field)
    : null;
  if (input) {
    const message = form.querySelector(`#${input.id}-error`);
    input.setAttribute('aria-invalid', 'true');
    message.textContent = friendlyError(error);
    message.hidden = false;
    input.focus();
  } else {
    const message = form.querySelector('.form-error');
    message.textContent = friendlyError(error);
    message.hidden = false;
  }
}

export function bindErrorClearing(form) {
  form.addEventListener('input', event => {
    const input = event.target;
    if (input.matches('input')) {
      input.removeAttribute('aria-invalid');
      const fieldError = form.querySelector(`#${input.id}-error`);
      if (fieldError) fieldError.hidden = true;
      const generalError = form.querySelector('.form-error');
      if (generalError) generalError.hidden = true;
    }
  });
}

export function createDialog(content) {
  const previous = document.querySelector('.dialog');
  if (previous) { previous.close(); previous.remove(); }
  const dialog = document.createElement('dialog');
  dialog.className = 'dialog';
  const headingId = `dialog-heading-${++dialogNumber}`;
  dialog.setAttribute('aria-labelledby', headingId);
  // A marcação é escrita neste módulo; valores vindos da API entram escapados ou por textContent/value.
  dialog.innerHTML = `<button class="dialog-close flex items-center justify-center" type="button" aria-label="Fechar janela">${icon('close')}</button>${content}`;
  dialog.querySelector('h2').id = headingId;
  document.body.append(dialog);
  const close = () => {
    if (dialog.querySelector('[aria-busy="true"]')) return;
    dialog.close();
  };
  dialog.querySelector('.dialog-close').addEventListener('click', close);
  dialog.addEventListener('cancel', event => {
    if (dialog.querySelector('[aria-busy="true"]')) event.preventDefault();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')]
      .filter(control => control.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.showModal();
  const autofocus = dialog.querySelector('[autofocus]');
  if (autofocus) autofocus.focus();
  return { dialog, close };
}

function dialogField(id, label, type = 'email', field = 'email', autocomplete = 'username') {
  const password = type === 'password';
  return `<div class="field">
    <label for="${id}">${label}</label>
    <div class="input-wrap">
      ${icon(password ? 'lock' : 'mail', 'field-icon')}
      <input id="${id}" name="${field === 'confirm-password' ? 'confirmPassword' : field}" data-field="${field}" type="${type}" autocomplete="${autocomplete}" maxlength="${password ? '128' : '254'}" required aria-describedby="${id}-error" ${password ? '' : 'inputmode="email" autofocus'}>
      ${password ? `<button class="visibility-button flex items-center justify-center" type="button" data-toggle-password="${id}" aria-label="Mostrar ${field === 'confirm-password' ? 'confirmação de senha' : 'senha'}" aria-pressed="false">${icon('eye')}</button>` : ''}
    </div>
    <p id="${id}-error" class="field-error" hidden></p>
  </div>`;
}

function bindDialogForm(dialog, handler, loadingLabel = 'Salvando…') {
  const form = dialog.querySelector('form');
  bindPasswordToggles(form);
  bindErrorClearing(form);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    clearErrors(form);
    const values = new FormData(form);
    setBusy(form, true, loadingLabel);
    try {
      await handler(values, form);
    } catch (error) {
      setBusy(form, false);
      showFormError(form, error);
      return;
    }
    setBusy(form, false);
  });
  return form;
}

export function openRecovery(initialEmail = '') {
  const { dialog } = createDialog(`
    <h2>Recupere seu acesso</h2>
    <p>Informe o e-mail cadastrado para gerar um link de redefinição.</p>
    <p class="recovery-demo-note">Nenhum e-mail é enviado: o servidor devolve o link, que aparece aqui.</p>
    <form novalidate>
      ${dialogField('reset-email', 'E-mail cadastrado')}
      <p class="form-error" role="alert" hidden></p>
      <button class="button button--primary w-full" type="submit">Gerar link</button>
    </form>
    <section id="recovery-result" class="recovery-result" role="status" hidden><p>Link gerado para <strong id="recovery-email"></strong>.</p><p id="recovery-expiry">Use em até 30 minutos. O link só pode ser usado uma vez.</p><a class="button button--primary w-full" id="recovery-link">Abrir link de redefinição</a></section>`);
  dialog.querySelector('#reset-email').value = initialEmail;
  bindDialogForm(dialog, async values => {
    const result = await requestPasswordReset(values.get('email'));
    dialog.querySelector('#recovery-email').textContent = result.email;
    dialog.querySelector('#recovery-expiry').textContent = `Use em até ${result.expiresInMinutes} minutos. O link só pode ser usado uma vez; gerar outro invalida este.`;
    dialog.querySelector('#recovery-link').href = result.link;
    dialog.querySelector('#recovery-result').hidden = false;
    dialog.querySelector('form').hidden = true;
    dialog.querySelector('#recovery-link').focus();
  }, 'Gerando link…');
}

export function openResetFromLink(token) {
  // Tira o token da URL e do histórico.
  history.replaceState(null, '', location.pathname);
  const { dialog } = createDialog(`
    <h2>Redefinir senha</h2>
    <p>Escolha uma nova senha para sua conta.</p>
    <form novalidate>
      ${dialogField('reset-password', 'Nova senha', 'password', 'password', 'new-password')}
      ${dialogField('reset-confirm', 'Confirme a nova senha', 'password', 'confirm-password', 'new-password')}
      <p class="form-error" role="alert" hidden></p>
      <button class="button button--primary w-full" type="submit">Salvar nova senha</button>
      <button class="button button--subtle w-full" id="request-new-reset" type="button">Solicitar outro link</button>
    </form>`);
  dialog.querySelector('#reset-password').focus();
  dialog.querySelector('#request-new-reset').addEventListener('click', () => openRecovery(document.getElementById('email')?.value || lastEmail()));
  bindDialogForm(dialog, async values => {
    await resetPassword(token, values.get('password'), values.get('confirmPassword'));
    dialog.close();
    const email = document.getElementById('email');
    if (email && !email.value) email.value = lastEmail();
    document.getElementById('password')?.focus();
    showToast('Senha atualizada. Entre com a nova senha.');
  });
}

export function showSession(session, title = 'Você entrou no Sintetiza') {
  if (!session) return;
  const isGuest = session.kind === 'guest';
  const { dialog, close } = createDialog(`
    <div class="session-icon flex items-center justify-center">${icon('check')}</div>
    <h2></h2>
    <p class="session-email"></p>
    <p class="session-detail"></p>
    <a class="button button--primary w-full" href="/inicio.html">Abrir meu início</a>
    ${isGuest ? '<a class="button button--primary w-full" href="/tela-3.html" id="guest-register">Criar minha conta</a>' : '<button class="button button--primary w-full" id="manage-account" type="button">Gerenciar conta</button>'}
    <button class="button button--subtle w-full" id="session-close" type="button">Voltar à tela</button>
    <button class="text-link w-full recovery-button" id="logout-button" type="button">Sair</button>`);
  dialog.querySelector('h2').textContent = isGuest ? 'Bem-vindo, convidado!' : title;
  dialog.querySelector('.session-email').textContent = isGuest ? 'Seu modo convidado está ativo.' : session.account.email;
  dialog.querySelector('.session-detail').textContent = isGuest
    ? 'Suas tarefas ficam salvas no servidor enquanto a sessão estiver ativa. Crie uma conta quando quiser.'
    : 'Seus dados ficam salvos no servidor. A sessão continua ativa ao atualizar a página.';
  dialog.querySelector('#session-close').addEventListener('click', close);
  dialog.querySelector('#manage-account')?.addEventListener('click', () => openAccountManager(session));
  dialog.querySelector('#guest-register')?.addEventListener('click', async event => {
    event.preventDefault();
    const link = event.currentTarget;
    if (link.getAttribute('aria-busy') === 'true') return;
    link.setAttribute('aria-busy', 'true');
    await logout();
    location.href = link.href;
  });
  dialog.querySelector('#logout-button').addEventListener('click', async event => {
    const button = event.currentTarget;
    setBusy(button, true, 'Saindo…');
    await logout();
    dialog.close();
    showToast('Você saiu da sua conta.');
  });
}

function openAccountManager(session) {
  const { dialog } = createDialog(`
    <h2>Minha conta</h2>
    <p>Atualize o e-mail da sua conta.</p>
    <form novalidate>
      ${dialogField('account-email', 'Endereço de e-mail')}
      <p class="form-error" role="alert" hidden></p>
      <button class="button button--primary w-full" type="submit">Salvar alterações</button>
      <button class="button button--subtle w-full" id="account-back" type="button">Voltar</button>
      <button class="text-link recovery-button w-full" id="delete-account" type="button">Excluir conta</button>
    </form>`);
  dialog.querySelector('#account-email').value = session.account.email;
  bindDialogForm(dialog, async values => {
    const current = await updateAccountEmail(values.get('email'));
    dialog.close();
    showSession(current, 'Conta atualizada');
    showToast('Alterações salvas.');
  });
  dialog.querySelector('#account-back').addEventListener('click', () => showSession(session));
  dialog.querySelector('#delete-account').addEventListener('click', () => confirmDeleteAccount(session));
}

function confirmDeleteAccount(session) {
  const { dialog } = createDialog(`
    <h2>Excluir conta?</h2>
    <p class="session-email"></p>
    <p class="danger-note">A conta, as tarefas, os espaços e as conversas serão removidos do servidor. Esta ação é definitiva.</p>
    <form>
      <p class="form-error" role="alert" hidden></p>
      <button class="button button--danger w-full" type="submit">Excluir minha conta</button>
      <button class="button button--subtle w-full" id="cancel-delete" type="button">Cancelar</button>
    </form>`);
  dialog.querySelector('.session-email').textContent = session.account.email;
  dialog.querySelector('#cancel-delete').addEventListener('click', () => openAccountManager(session));
  bindDialogForm(dialog, async () => {
    await deleteAccount();
    dialog.close();
    const email = document.getElementById('email');
    if (email) email.value = '';
    showToast('Conta excluída.');
  }, 'Excluindo…');
}
