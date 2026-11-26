// Loaded lazily from index.ts, so React stays out of the game's own bundle.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Leaderboard } from './Leaderboard';

export function mount(el: HTMLElement): void {
  createRoot(el).render(
    <StrictMode>
      <Leaderboard />
    </StrictMode>,
  );
}
