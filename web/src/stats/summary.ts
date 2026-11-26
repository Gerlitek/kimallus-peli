// The summary the nightly run writes (stats.json at the site root), and how the dashboard turns it into tiles and bars.
// Pure functions: the React components only draw what these return, so the numbers are tested without a browser.
import { CLIPS } from '../data/clips';
import { POLISHES } from '../data/polishes';

/** The shape of stats.json. Everything is counted from anonymous game events; no player names. */
export interface Summary {
  generated: string;
  recent_days: number;
  /** Distinct players in the recent days. */
  players_recent: number;
  days: { day: string; started: number; home: number }[];
  games: { started: number; home: number; median_duration_s: number; median_score: number };
  /** Games by the highest level they reached. */
  highest_level: Record<string, number>;
  stations: Record<StationId, { visited: number; skipped: number }>;
  /** Brush strokes by polish, and clips by kind. */
  polishes: Record<string, number>;
  clips: Record<string, number>;
  /** Obstacles bumped into or fallen at. */
  bumps: Record<string, number>;
  clouds_cheered: number;
  stars: number;
}

export interface TileData {
  value: string;
  label: string;
}

export interface Bar {
  label: string;
  value: number;
  /** Shown after the bar instead of the plain value. */
  text?: string;
  color?: string;
}

export interface CardData {
  title: string;
  bars: Bar[];
  /** Spans both columns. */
  wide?: boolean;
}

type StationId = 'polish' | 'clip' | 'share';

const GOLD = '#ffc94a';
const LAVENDER = '#C9A7FF';
const STATION_NAMES: Record<StationId, string> = { polish: 'Kynsien lakkaus', clip: 'Harjaklipsit', share: 'Kuppikakun jakaminen' };
const OBSTACLE_NAMES: Record<string, string> = { diamond: 'Jalokivi', rainbow: 'Sateenkaari', river: 'Timanttijoki', porridge: 'Puurokulho' };
const CLIP_NAMES: Record<string, string> = { heart: 'Sydän', star: 'Tähti', bow: 'Rusetti', flower: 'Kukka', gem: 'Timantti' };
const CLIP_COLORS: Record<string, string> = { heart: '#ff4f9a', star: GOLD, bow: '#ff4f9a', flower: '#b98aff', gem: '#6fd0ff' };

export const fmt = (n: number) => n.toLocaleString('fi-FI');
const pct = (part: number, all: number) => (all ? `${Math.round((100 * part) / all)} %` : '–');
const byCount = (table: Record<string, number>) => Object.entries(table).sort((a, b) => b[1] - a[1]);

/** A cheap check that a fetched document is a summary at all, so a broken file shows "on its way" instead of crashing. */
export function isSummary(data: unknown): data is Summary {
  const s = data as Summary | null;
  return typeof s?.games?.started === 'number' && Array.isArray(s.days) && typeof s.stations === 'object';
}

export function toTiles(s: Summary): TileData[] {
  const g = s.games;
  return [
    { value: fmt(g.started), label: 'pelikertaa' },
    { value: fmt(s.players_recent), label: `pelaajaa, ${s.recent_days} pv` },
    { value: pct(g.home, g.started), label: 'pääsi kotiin asti' },
    { value: `${Math.floor(g.median_duration_s / 60)} min ${g.median_duration_s % 60} s`, label: 'pelin kesto, mediaani' },
    { value: fmt(g.median_score), label: 'kimallusta, mediaani' },
    { value: fmt(s.clouds_cheered), label: 'pilveä ilahdutettu' },
  ];
}

export function toCards(s: Summary): CardData[] {
  return [
    {
      title: 'Pelit päivittäin',
      wide: true,
      bars: s.days.map((d) => ({
        label: `${d.day.slice(8)}.${d.day.slice(5, 7)}.`,
        value: d.started,
        text: `${fmt(d.started)}, kotiin ${fmt(d.home)}`,
      })),
    },
    {
      title: 'Korkein saavutettu taso',
      bars: [1, 2, 3].map((level) => ({ label: '★'.repeat(level), value: s.highest_level[level] ?? 0, color: GOLD })),
    },
    {
      title: 'Rauhoittumispisteet: käytiin vai hypättiin yli',
      bars: (Object.keys(STATION_NAMES) as StationId[]).map((id) => {
        const { visited, skipped } = s.stations[id] ?? { visited: 0, skipped: 0 };
        return { label: STATION_NAMES[id], value: visited, text: `${fmt(visited)} (${pct(visited, visited + skipped)})`, color: LAVENDER };
      }),
    },
    // Polishes and clips are drawn in their own colours, as in the game.
    {
      title: 'Suosituimmat kynsilakat',
      bars: byCount(s.polishes).map(([id, value]) => {
        const polish = POLISHES.find((p) => p.id === id);
        return { label: polish?.name ?? id, value, color: polish?.color };
      }),
    },
    {
      title: 'Suosituimmat klipsit',
      bars: byCount(s.clips)
        .filter(([id]) => (CLIPS as readonly string[]).includes(id))
        .map(([id, value]) => ({ label: CLIP_NAMES[id] ?? id, value, color: CLIP_COLORS[id] })),
    },
    {
      title: 'Mihin esteeseen kompastuttiin',
      wide: true,
      bars: byCount(s.bumps).map(([id, value]) => ({ label: OBSTACLE_NAMES[id] ?? id, value })),
    },
  ];
}
