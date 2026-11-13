import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // data/ holds the bundled snapshot and its licence; Vite copies them
  // unchanged to the site root and serves them in development.
  publicDir: 'data',
  test: {
    // Agent worktrees contain their own copy of the tests.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
