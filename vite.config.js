import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- Обязательный импорт

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- Обязательный вызов плагина
  ],
})