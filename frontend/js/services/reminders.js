import { listNotifications, markNotificationRead } from '../api/notifications.js';
import { localToday } from '../utils/helpers.js';

const WORKER_URL = '/reminder-worker.js';
const POLL_MS = 60_000;
const DAY_CHECK_MS = 15_000;
let registration;

export async function prepareNotifications() {
  if (!globalThis.isSecureContext || !('Notification' in globalThis)) return 'unsupported';
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission === 'granted' && 'serviceWorker' in navigator) {
    registration = await navigator.serviceWorker.register(WORKER_URL);
    if (!registration.active) await new Promise((resolve, reject) => {
      const worker = registration.installing || registration.waiting;
      if (!worker || worker.state === 'activated') { resolve(); return; }
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') resolve();
        if (worker.state === 'redundant') reject(new Error('Não foi possível ativar as notificações.'));
      });
    });
  }
  return permission;
}

async function systemNotification(notification, onOpenToday) {
  if (globalThis.Notification?.permission !== 'granted') return;
  try {
    if ('serviceWorker' in navigator) {
      registration ||= await navigator.serviceWorker.register(WORKER_URL);
      if (registration.active) {
        await registration.showNotification(notification.title, { body: notification.body, tag: `sintetiza-${notification.id}`, data: { url: '/inicio.html?view=today' } });
        return;
      }
    }
    const shown = new Notification(notification.title, { body: notification.body, tag: `sintetiza-${notification.id}` });
    shown.onclick = () => { window.focus(); onOpenToday(); shown.close(); };
  } catch { /* o aviso dentro do app já foi exibido */ }
}

/**
 * O servidor gera o lembrete diário quando o app consulta `GET /notifications`
 * depois do horário escolhido (no máximo um por dia). Cada aviso é mostrado no
 * app e, com permissão, no sistema; depois é marcado como lido.
 */
export function startNotifications({ onNotification, onNewDay, onOpenToday, onError }) {
  let checking = false;
  let stopped = false;
  let reportedError = false;
  let day = localToday();

  async function check() {
    if (checking || stopped) return;
    checking = true;
    try {
      for (const notification of await listNotifications()) {
        onNotification(notification);
        await systemNotification(notification, onOpenToday);
        await markNotificationRead(notification.id).catch(() => {});
      }
      reportedError = false;
    } catch (error) {
      if (!reportedError && error.status !== 401) onError(error);
      reportedError = true;
    } finally { checking = false; }
  }

  async function checkDay() {
    if (stopped || day === localToday()) return;
    day = localToday();
    await onNewDay();
    await check();
  }

  const poll = setInterval(check, POLL_MS);
  const dayTimer = setInterval(() => { checkDay().catch(() => {}); }, DAY_CHECK_MS);
  const onVisible = () => { if (!document.hidden) { checkDay().catch(() => {}); check(); } };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  check();
  return {
    check,
    stop() {
      stopped = true;
      clearInterval(poll);
      clearInterval(dayTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    },
  };
}
