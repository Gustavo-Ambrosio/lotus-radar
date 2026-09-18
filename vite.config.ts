import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH ?? (command === 'build' ? '/lotus-radar/' : '/'),
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
}));
