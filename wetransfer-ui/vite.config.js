import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import config from './ui.config.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: config.frontend.port,
    proxy: {
      '/transfers': {
        target: `${config.backend.protocol}://${config.backend.host}:${config.backend.port}`,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})

