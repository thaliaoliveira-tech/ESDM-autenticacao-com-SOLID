import { continueAsGuest } from '../api/auth.js';
import { setBusy, showToast } from '../components/ui.js';
import { friendlyError } from '../utils/helpers.js';

export function initHome() {
  const button = document.getElementById('guest-button');
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    setBusy(button, true, 'Entrando…');
    try {
      await continueAsGuest();
      location.href = '/inicio.html';
    } catch (error) {
      showToast(friendlyError(error), 'error');
      setBusy(button, false);
    }
  });
}
