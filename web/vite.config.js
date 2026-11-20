import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const cacheDir = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'comercia-panel', 'vite')
  : './.vite-cache';

export default defineConfig({
  plugins: [react()],
  // Mantiene la caché fuera de node_modules y OneDrive, donde Windows puede bloquearla.
  cacheDir,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/@tanstack/')) return 'query-vendor';
          if (id.includes('/react-router') || id.includes('/@remix-run/')) return 'router-vendor';
          if (
            id.includes('/react-hook-form/') ||
            id.includes('/@hookform/') ||
            id.includes('/zod/')
          )
            return 'forms-vendor';
          if (id.includes('/lucide-react/')) return 'icons-vendor';
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/'))
            return 'react-vendor';
        },
      },
    },
  },
});
