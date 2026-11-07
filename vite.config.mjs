import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, renameSync } from 'node:fs';

// Only the build output gets a new index.html. The original entry is untouched.
export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react(), {
    name: 'haro-static-assets',
    closeBundle() {
      cpSync('images', 'dist/images', { recursive: true });
      renameSync('dist/react.html', 'dist/index.html');
    },
  }],
  build: {
    rolldownOptions: { input: 'react.html' },
  },
});
