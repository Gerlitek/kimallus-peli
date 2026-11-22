import { defineConfig } from 'vite';

// Relative base so the build works at the root of any domain.
// Two pages: the game and the dashboard (/tilastot/).
export default defineConfig({
  base: './',
  build: { rolldownOptions: { input: { main: 'index.html', stats: 'tilastot/index.html' } } },
});
