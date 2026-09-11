import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // The diagram lives one folder up so the CLI client and the editor read one file.
    fs: { allow: ['..'] },
    // The worker process hosts the bridge; proxying keeps the browser on one origin.
    proxy: { '/api': 'http://127.0.0.1:3210' },
  },
});
