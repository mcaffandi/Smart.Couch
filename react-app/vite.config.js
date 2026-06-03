import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
    }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'firebase';
            }
            if (id.includes('recharts')) {
              return 'recharts';
            }
            if (id.includes('xlsx') || id.includes('jszip')) {
              return 'excel-zip';
            }
            if (id.includes('react')) {
              return 'react-core';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
