import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    port: 5178,
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3010',
        ws: true
      }
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../dist/client'),
    emptyOutDir: true
  }
});
