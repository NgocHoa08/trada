import { defineConfig } from 'vite';

const API = 'http://localhost:8787';

export default defineConfig({
  server: {
    host: true, // cho phép mở từ điện thoại trong cùng mạng LAN
    port: 5173,
    proxy: {
      '/health': API,
      '/time': API,
      '/topic': API,
      '/ws': {
        target: 'ws://localhost:8787',
        ws: true,
      },
    },
  },
});
