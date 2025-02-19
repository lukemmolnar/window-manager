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
})