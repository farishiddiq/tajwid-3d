import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // path relatif agar bisa di-hosting di folder mana pun (situs statis + CDN)
  base: './',
  build: {
    chunkSizeWarningLimit: 1200,
  },
})
