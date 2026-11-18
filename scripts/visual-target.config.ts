import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'static',
  server: { host: '127.0.0.1', port: 5182, strictPort: true },
});
