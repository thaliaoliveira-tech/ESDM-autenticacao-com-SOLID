export class AppError extends Error {
  constructor(message, field = '') {
    super(message);
    this.name = 'AppError';
    this.field = field;
  }
}

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export const normalizeEmail = value => String(value ?? '').trim().toLowerCase();

// Validações locais dão retorno imediato; a API valida tudo de novo e é a palavra final.
export function validateEmail(value) {
  const email = normalizeEmail(value);
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Informe um endereço de e-mail válido.', 'email');
  }
  return email;
}

export function validateUsername(value) {
  const username = String(value ?? '').trim().toLowerCase();
  if (!/^[a-z0-9._]{3,30}$/.test(username)) {
    throw new AppError('Use de 3 a 30 caracteres: letras sem acento, números, ponto ou sublinhado.', 'username');
  }
  return username;
}

export function validatePassword(password, confirmation) {
  if (password.length < 8 || password.length > 128) {
    throw new AppError('Use uma senha entre 8 e 128 caracteres.', 'password');
  }
  if (confirmation !== undefined && password !== confirmation) {
    throw new AppError('As senhas precisam ser iguais.', 'confirm-password');
  }
}

export function friendlyError(error) {
  if (error instanceof AppError) return error.message;
  return 'Algo deu errado. Tente novamente.';
}

// "Trabalho", "trabalho " e "Trabálho" são o mesmo espaço (mesma regra da API).
export const spaceKey = name => String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();

export const pad = value => String(value).padStart(2, '0');
export const localDateString = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const localToday = () => localDateString(new Date());
export const tomorrow = () => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return localDateString(date);
};
export const displayDate = iso => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';
export const timeOf = value => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
export const plural = (count, one, many) => `${Number(count).toLocaleString('pt-BR')} ${count === 1 ? one : many}`;

export function debounce(fn, wait = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
