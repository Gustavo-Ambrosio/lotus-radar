import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Config propria do Vitest. Antes o runner herdava `vite.config.ts`, que hoje
 * nao existe (o build e' Next.js). Os testes cobrem codigo puro em `src/lib`
 * e `scripts`, entao nao ha necessidade do plugin de React aqui.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
