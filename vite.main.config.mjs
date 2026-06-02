import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'electron/main.js',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['electron', 'better-sqlite3', 'path', 'url', 'child_process', 'util', 'fs', 'crypto'],
      output: {
        entryFileNames: '[name].cjs',
      },
    },
    outDir: '.vite/build',
  },
  resolve: {
    conditions: ['node'],
  },
});
