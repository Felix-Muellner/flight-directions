/// <reference types="node" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/; the deploy workflow passes
  // that path in BASE_PATH. Everywhere else the site lives at the root.
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  // data/ holds the bundled snapshot and its licence; Vite copies them
  // unchanged to the site root and serves them in development.
  publicDir: 'data',
  test: {
    // Agent worktrees contain their own copy of the tests.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
