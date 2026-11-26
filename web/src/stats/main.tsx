// Entry of the dashboard (tilastot/index.html). The page header is static HTML; React draws the numbers below it.
import '../fonts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DEMO } from '../systems/api';
import { StatsPage } from './StatsPage';

createRoot(document.getElementById('stats')!).render(
  <StrictMode>
    <StatsPage demo={DEMO} />
  </StrictMode>,
);
