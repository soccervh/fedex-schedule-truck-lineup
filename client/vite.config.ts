import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from 'vite'
import { qrcode } from 'vite-plugin-qrcode'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    reactRouter(),
    qrcode(),
  ],
  server: {
    host: true,
    port: 5173,
  },
})
