import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Agent worktrees contain their own copy of the tests.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
