import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to backend during development
    // This avoids CORS issues in development
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",   // Import with @ instead of ../../
    },
  },
})