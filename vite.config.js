import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  resolve: {
    alias: mode === 'test'
      ? [
          {
            find: './features/workspace/MarkdownWorkspace',
            replacement: fileURLToPath(new URL('./src/tests/MarkdownWorkspace.test-double.jsx', import.meta.url)),
          },
          {
            find: './hooks/usePreviewInteractions',
            replacement: fileURLToPath(new URL('./src/tests/usePreviewInteractions.test-double.js', import.meta.url)),
          },
        ]
      : [],
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('katex')) {
              return 'katex';
            }
            if (id.includes('mermaid')) {
              return 'mermaid';
            }
            if (id.includes('react-syntax-highlighter') || id.includes('prismjs') || id.includes('lowlight')) {
              return 'syntax-highlighter';
            }
            // ponytail: match core react runtime only, avoiding package-name false positives like @uiw/react-md-editor
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
              return 'vendor-react';
            }
          }
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    exclude: ['**/node_modules/**', '**/dist/**', 'cli/**'],
    pool: 'forks',
    maxWorkers: 2,
    minWorkers: 1,
    execArgv: ['--max-old-space-size=1024'],
    testTimeout: 15000,
  },
}))
