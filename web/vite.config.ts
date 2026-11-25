import { defineConfig } from 'vite';

// Relative base so the build works at the root of any domain.
// Two pages: the game and the dashboard (/tilastot/).
export default defineConfig({
  base: './',
  build: { rolldownOptions: { input: { main: 'index.html', stats: 'tilastot/index.html' } } },
  // In AWS, CloudFront serves the API under the game's own address (/api/*). The dev server does the same
  // with the local API (`npm run dev:api`), so the browser never makes a cross-origin request.
  server: { proxy: { '/api': 'http://localhost:3001' } },
});
