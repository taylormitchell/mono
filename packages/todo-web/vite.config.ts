import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Todo Web App",
        short_name: "Todo",
        start_url: "/",
        display: "standalone",
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
