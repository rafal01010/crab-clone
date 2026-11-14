declare module '*build/handler.js' {
  import type { RequestListener } from 'node:http';
  export const handler: RequestListener;
}
