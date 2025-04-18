import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'


// This configuration sets up Vite with both React and Tailwind CSS support
export default defineConfig({
  // Configure dev server with proxy for API requests
  server: {
    proxy: {
      '/api': {
        target: 'http://45.45.239.125:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  plugins: [
    // The React plugin enables JSX processing and Fast Refresh
    react(),
    // The Tailwind plugin handles utility class generation
    tailwindcss(),
    // Configure Node.js polyfills for SimplePeer
    nodePolyfills({
      // Whether to polyfill specific Node.js globals
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill Node.js builtins
      protocolImports: true,
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      // Provide Node.js polyfills for browser environment
      buffer: 'buffer'
    }
  },
  define: {
    // Define global variables for browser environment
    global: 'window',
    'process.env': {}
  },
  optimizeDeps: {
    // Include Node.js modules that need to be pre-bundled
    include: ['buffer', 'simple-peer']
  },
  build: {
    // Configure Rollup to handle Node.js modules
    rollupOptions: {
      output: {
        manualChunks: {
          'simple-peer': ['simple-peer']
        }
      }
    },
    // Enable content hashing in filenames for cache busting
    assetsDir: 'assets',
    sourcemap: true,
    manifest: true,
    // Use content hashing to force cache invalidation when files change
    chunkFileNames: 'assets/js/[name]-[hash].js',
    entryFileNames: 'assets/js/[name]-[hash].js',
    assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
  }
})
