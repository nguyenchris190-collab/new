import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // The glob below already covers icons; avoid the plugin adding them a second time.
      includeManifestIcons: false,
      manifest: {
        name: 'DrillEngine',
        short_name: 'DrillEngine',
        description: 'Offline-first personal math practice.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#18181b',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell, bundles and KaTeX woff2 fonts are precached so the app boots with no network.
        // (Browsers that support woff2 never request the .woff/.ttf fallbacks, so those are skipped.)
        globPatterns: ['**/*.{html,js,css,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  base: './',
  build: { chunkSizeWarningLimit: 800 },
});
