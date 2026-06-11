import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function midtransDevPlugin() {
  return {
    name: 'midtrans-dev-plugin',
    configureServer(server) {
      server.middlewares.use('/api/midtrans', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body);
              // In Vite dev server we can access process.env if we load it, or just pass it in env.
              // Make sure to add VITE_MIDTRANS_SERVER_KEY to your .env.local
              const SERVER_KEY = process.env.VITE_MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY;
              
              // We use dynamic import for node-fetch if native fetch isn't available, 
              // but Vite runs on Node 18+ which has native fetch.
              const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Authorization': `Basic ${Buffer.from(SERVER_KEY + ':').toString('base64')}`
                },
                body: JSON.stringify({
                  transaction_details: {
                    order_id: data.order_id,
                    gross_amount: data.gross_amount
                  },
                  customer_details: {
                    first_name: data.first_name,
                    email: data.email
                  }
                })
              });

              const text = await response.text();
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = response.status;
              res.end(text);
            } catch (error) {
              res.statusCode = 500;
              res.end(JSON.stringify({ message: error.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  }
}

export default defineConfig({
  plugins: [react(), midtransDevPlugin()],
  server: {
    port: 5173,
    host: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
    }
  },
  build: {
    chunkSizeWarningLimit: 2000,
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
