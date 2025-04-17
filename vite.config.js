import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  sever: {
    host: true,
    port: 5174,
  }
})
