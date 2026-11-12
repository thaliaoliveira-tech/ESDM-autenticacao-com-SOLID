import { login } from '../api/auth.js';
import { bindErrorClearing, clearErrors, setBusy, showFormError, showSession, openRecovery } from '../components/ui.js';

export function initLogin(state) {
  const form = document.getElementById('login-form');
  form.elements.email.value = state.lastEmail;
  bindErrorClearing(form);
  document.getElementById('recovery-button').addEventListener('click', () => openRecovery(form.elements.email.value));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    clearErrors(form);
    const email = form.elements.email.value;
    const password = form.elements.password.value;
    setBusy(form, true, 'Entrando…');
    try {
      const session = await login(email, password);
      form.elements.password.value = '';
      setBusy(form, false);
      showSession(session);
    } catch (error) {
      setBusy(form, false);
      showFormError(form, error);
    }
  });
}
