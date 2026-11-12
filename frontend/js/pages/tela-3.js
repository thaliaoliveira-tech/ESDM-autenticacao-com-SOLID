import { createAccount } from '../api/auth.js';
import { bindErrorClearing, clearErrors, setBusy, showFormError, showSession, showToast } from '../components/ui.js';

export function initRegister(state) {
  const form = document.getElementById('register-form');
  form.elements.email.value = state.lastEmail;
  bindErrorClearing(form);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    clearErrors(form);
    const username = form.elements.username.value;
    const email = form.elements.email.value;
    const password = form.elements.password.value;
    const confirmation = form.elements.confirmPassword.value;
    setBusy(form, true, 'Cadastrando…');
    try {
      const session = await createAccount(username, email, password, confirmation);
      form.elements.password.value = '';
      form.elements.confirmPassword.value = '';
      setBusy(form, false);
      showSession(session, 'Sua conta está pronta!');
      showToast('Conta criada.');
    } catch (error) {
      setBusy(form, false);
      showFormError(form, error);
    }
  });
}
