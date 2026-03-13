import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), basicSsl()],
  build: {
    // Imágenes estáticas < 8 KB → base64 inline (0 peticiones extra al arrancar)
    assetsInlineLimit: 8192,
    rollupOptions: {
      output: {
        manualChunks: {
          // React + router en chunk separado (no cambia entre deploys)
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Iconos en chunk propio (librería grande, cambia poco)
          icons: ['lucide-react'],
        }
      }
    }
  },
})
