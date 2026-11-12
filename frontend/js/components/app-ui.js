import { icon, createDialog, setBusy, showToast } from './ui.js';
import { escapeHTML, friendlyError } from '../utils/helpers.js';

export { icon, escapeHTML, showToast };

const darkScheme = matchMedia('(prefers-color-scheme: dark)');
let themePreference = 'system';

// "system" acompanha o aparelho, inclusive quando ele muda.
export function applyTheme(preference = themePreference) {
  themePreference = preference;
  const dark = preference === 'dark' || (preference === 'system' && darkScheme.matches);
  document.body.dataset.theme = dark ? 'dark' : 'light';
}
darkScheme.addEventListener('change', () => applyTheme());

export function modal(content, submitHandler, label = 'Salvando…') {
  const result = createDialog(content);
  result.dialog.classList.add('app-dialog');
  const form = result.dialog.querySelector('form');
  if (form && submitHandler) {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (form.getAttribute('aria-busy') === 'true') return;
      const data = new FormData(form);
      const errorElement = form.querySelector('.dialog-error');
      if (errorElement) errorElement.hidden = true;
      setBusy(form, true, label);
      try {
        await submitHandler(data, result.dialog);
      } catch (error) {
        if (errorElement) { errorElement.textContent = friendlyError(error); errorElement.hidden = false; }
        else showToast(friendlyError(error), 'error');
      } finally { setBusy(form, false); }
    });
  }
  return result;
}

export function dialogError() { return '<p class="dialog-error" role="alert" hidden></p>'; }

export async function runAction(button, action) {
  if (button.disabled) return;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try { await action(); }
  catch (error) { showToast(friendlyError(error), 'error'); }
  finally { button.disabled = false; button.setAttribute('aria-busy', 'false'); }
}
