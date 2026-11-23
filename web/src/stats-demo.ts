// Made-up numbers for working on the dashboard layout (/tilastot/?demo). Clearly marked as examples on the page.
import type { Summary } from './stats';

export const DEMO_SUMMARY: Summary = {
  generated: '2026-11-23T02:30:00+00:00',
  recent_days: 30,
  players_recent: 41,
  days: [
    { day: '2026-11-17', started: 6, home: 0 },
    { day: '2026-11-18', started: 11, home: 1 },
    { day: '2026-11-19', started: 9, home: 1 },
    { day: '2026-11-20', started: 17, home: 3 },
    { day: '2026-11-21', started: 24, home: 4 },
    { day: '2026-11-22', started: 31, home: 6 },
    { day: '2026-11-23', started: 14, home: 2 },
  ],
  games: { started: 112, home: 17, median_duration_s: 262, median_score: 148 },
  highest_level: { '1': 61, '2': 29, '3': 22 },
  stations: {
    polish: { visited: 139, skipped: 21 },
    clip: { visited: 96, skipped: 18 },
    share: { visited: 58, skipped: 9 },
  },
  polishes: { pink: 118, 'holo-glitter': 104, 'blue-glitter': 91, gold: 77, rose: 60, 'mint-glitter': 58, red: 48 },
  clips: { bow: 121, heart: 109, star: 98, gem: 87, flower: 65 },
  bumps: { diamond: 208, rainbow: 131, river: 84, porridge: 37 },
  clouds_cheered: 388,
  stars: 2140,
};
