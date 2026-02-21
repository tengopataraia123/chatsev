import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Production: Remove console.log/warn for security & performance
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.png', 'robots.txt'],
      manifest: {
        id: '/',
        name: 'ChatSev - ქართული სოციალური ქსელი',
        short_name: 'ChatSev',
        description: 'შეუერთდი საზოგადოებას, გააზიარე მომენტები და დაუკავშირდი მეგობრებს.',
        theme_color: '#8B5CF6',
        background_color: '#0F0F23',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/?source=pwa',
        prefer_related_applications: false,
        categories: ['social', 'entertainment'],
        launch_handler: {
          client_mode: 'navigate-existing'
        },
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit for large eager-loaded bundle
        // Prevent caching auth/api requests entirely
        navigateFallbackDenylist: [/^\/auth/, /\/rest\//, /\/realtime\//, /\.supabase\.co/, /^\/~oauth/],
        runtimeCaching: [
          {
            // Videos from Supabase storage - NetworkOnly (don't cache large files)
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*\.(mp4|mov|webm|m3u8)/i,
            handler: 'NetworkOnly'
          },
          {
            // Cache Supabase storage images only - NOT videos
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*\.(png|jpg|jpeg|gif|webp|svg)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'storage-image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache external images (avatars, etc.)
            urlPattern: /\.(png|jpg|jpeg|gif|webp|svg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 3 // 3 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache Google fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            // ALL other supabase calls - NetworkOnly (no caching)
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly'
          }
        ],
        // Skip waiting for faster updates
        skipWaiting: true,
        clientsClaim: true,
        // Precache important chunks
        additionalManifestEntries: []
      }
    })
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-accordion',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-select',
            '@radix-ui/react-switch',
          ],
          'vendor-3d': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-motion': ['framer-motion'],
          'vendor-charts': ['recharts'],
          'vendor-media': ['hls.js'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-markdown': ['react-markdown'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
    target: 'es2022',
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    minify: 'esbuild',
    sourcemap: false,
    assetsInlineLimit: 8192,
    modulePreload: { polyfill: false },
    cssMinify: 'esbuild',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));