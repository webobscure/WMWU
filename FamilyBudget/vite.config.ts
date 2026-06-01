import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { priceApiPlugin } from './vite-plugin-price-api'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), priceApiPlugin()],
})
