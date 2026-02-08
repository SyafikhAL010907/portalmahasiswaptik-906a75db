import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173, // ✅ BENAR: Frontend jalan di 5173
    allowedHosts: true, // ✅ BENAR: Biar aman akses dari mana aja
    hmr: {
      overlay: false,
    },
    proxy: {
      // ✅ JEMBATAN PENTING: Arahkan /api ke Backend Go (8080)
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));