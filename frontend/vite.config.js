import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

// O navegador fala apenas com o Vite; /api e repassado para a API NestJS.
// Assim nao ha CORS em desenvolvimento e o streaming (SSE) do chat passa direto.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.BACKEND_URL || 'http://localhost:3000';
  const proxy = {
    '/api': {
      target: backend,
      changeOrigin: true,
      rewrite: path => path.replace(/^\/api/, ''),
    },
  };
  return {
    server: { port: Number(env.PORT) || 5173, strictPort: false, proxy },
    preview: { port: 4173, proxy },
    build: {
      rollupOptions: {
        input: {
          index: resolve(import.meta.dirname, 'index.html'),
          login: resolve(import.meta.dirname, 'tela-2.html'),
          register: resolve(import.meta.dirname, 'tela-3.html'),
          inicio: resolve(import.meta.dirname, 'inicio.html'),
        },
      },
    },
  };
});
