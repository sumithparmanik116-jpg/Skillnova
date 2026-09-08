import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_TARGET = process.env.VITE_API_URL ? process.env.VITE_API_URL.replace(/\/api\/v1$/, '') : 'http://localhost:4000';
const SOCKET_TARGET = process.env.VITE_SOCKET_URL || API_TARGET;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    strictPort: true,
    host: true,
    proxy: {
      '/api/v1': { target: API_TARGET, changeOrigin: true },
      '/api/aiassistant': { target: process.env.VITE_AIASSISTANT_URL || 'http://localhost:8000', changeOrigin: true },
      '/socket.io': { target: SOCKET_TARGET, ws: true, changeOrigin: true },
    },
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
    target: 'es2020',
  },
});