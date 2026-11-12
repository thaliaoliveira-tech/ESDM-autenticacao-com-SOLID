import { request } from './client.js';

/** Só as não lidas. Cada consulta também gera o lembrete diário que já venceu. */
export const listNotifications = async () => (await request('/notifications', { query: { pageSize: 20 } })).data;
export const markNotificationRead = id => request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
