import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/refteen/',
  build: {
    rollupOptions: {
      output: {
        // библиотеки меняются редко — отдельные чанки остаются в кеше браузера между деплоями
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['framer-motion', 'lenis', 'react-scroll'],
        },
      },
    },
  },
})
