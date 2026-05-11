import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      target: 'node18',
      rollupOptions: {
        input: {
          index: path.join(__dirname, 'electron/main.ts')
        },
        output: {
          format: 'cjs'
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      target: 'node18',
      rollupOptions: {
        input: {
          index: path.join(__dirname, 'electron/preload.ts')
        },
        output: {
          format: 'cjs'
        }
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      target: 'chrome106',
      rollupOptions: {
        input: path.join(__dirname, 'index.html')
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    plugins: [react()],
    css: {
      postcss: './postcss.config.js'
    }
  }
})
