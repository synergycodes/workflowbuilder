import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // shared/ lives one folder up: the diagram, the wire types and the coin flip both processes use.
    fs: { allow: ['..'] },
    // The worker process hosts the bridge; proxying keeps the browser on one origin.
    proxy: { '/api': 'http://127.0.0.1:3210' },
  },
});
