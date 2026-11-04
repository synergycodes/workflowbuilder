import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // shared/ lives one folder up: the diagram, the wire types and the trigger payload both processes use.
    fs: { allow: ['..'] },
    // The worker process hosts the bridge; proxying keeps the browser on one origin.
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.BRIDGE_PORT ?? 3210}`,
        // When the bridge drops an event stream, the proxy keeps the browser's response open and
        // EventSource never reports an error. Ending it lets run.ts show the lost stream.
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyResponse, _request, response) => {
            proxyResponse.on('close', () => {
              if (!proxyResponse.complete) response.destroy();
            });
          });
        },
      },
    },
  },
});
