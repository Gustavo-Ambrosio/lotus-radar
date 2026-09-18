import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/lotus-radar/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
