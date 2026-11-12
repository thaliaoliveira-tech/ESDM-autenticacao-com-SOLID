import { request } from './client.js';

export const THEMES = ['system', 'light', 'dark'];
export const validReminderTime = time => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);

export const getSettings = () => request('/settings');
export const updateSettings = changes => request('/settings', { method: 'PATCH', body: changes });

/** O "hoje" do servidor (períodos e lembrete) segue o fuso salvo; alinha com o do aparelho. */
export async function syncTimezone(settings) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timezone || settings.timezone === timezone) return settings;
  try { return await updateSettings({ timezone }); } catch { return settings; }
}
