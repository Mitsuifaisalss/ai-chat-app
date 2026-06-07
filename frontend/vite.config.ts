import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    https: {
      key: fs.readFileSync('../backend/certs/key.pem'),
      cert: fs.readFileSync('../backend/certs/cert.pem'),
    },
    proxy: {
      "/api": {
        target: "https://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "wss://localhost:8000",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
