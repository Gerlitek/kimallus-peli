// What the game uses of the leaderboard. Nothing here imports React: the island is loaded on demand.
export { submitScore } from './rows';
export { refreshLeaderboard } from './store';

/**
 * Draws the leaderboard into `el` as a React island. React and the component come as their own chunk after the game
 * has started, so the first frame never waits for them. Without them the game still works; only the table is missing.
 */
export function mountLeaderboard(el: HTMLElement): void {
  import('./mount').then(({ mount }) => mount(el)).catch(() => {});
}
