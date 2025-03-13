import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// This configuration sets up Vite with both React and Tailwind CSS support
export default defineConfig({
  plugins: [
    // The React plugin enables JSX processing and Fast Refresh
    react(),
    // The Tailwind plugin handles utility class generation
    tailwindcss(),
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
    }
  }
})
