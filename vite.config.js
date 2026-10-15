import { defineConfig } from 'vite';
// RUN.world requirement: relative asset paths + build to ./dist
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', allowedHosts: true },
});
