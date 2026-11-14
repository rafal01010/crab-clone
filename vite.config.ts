import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit({ adapter: adapter(), version: { pollInterval: 0 } })],
  server: {
    proxy: {
      '/socket.io': {
        target:
          process.env.YCCE_DEV_HOST_URL ??
          `http://127.0.0.1:${process.env.PORT ?? '3000'}`,
        ws: true,
      },
    },
  },
});
