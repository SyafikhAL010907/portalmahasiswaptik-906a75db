import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173, // ✅ BENAR: Frontend jalan di 5173
    allowedHosts: true, // ✅ BENAR: Biar aman akses dari mana aja
    hmr: {
      overlay: false,
    },
    proxy: {
      // ✅ JEMBATAN PENTING: Arahkan /api ke Backend Go (8081)
      "/api": {
        target: "http://localhost:9000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: mode === "production" ? false : true, // ✅ SECURITY: Matikan Source Map di Produksi
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip'],
        },
      },
    },
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
   registerType: 'prompt', // JANGAN 'autoUpdate'
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'splash-unj.jpg', 'pwa-icon.png'],
      manifest: {
        name: 'Portal PTIK',
        short_name: 'Portal PTIK',
        description: 'Portal Akademik Mahasiswa PTIK UNJ',
        theme_color: '#F3E8FF',
        background_color: '#F3E8FF',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Increase limit to 5MB to prevent bottlenecks
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));