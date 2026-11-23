// The dashboard (tilastot/index.html). It only draws the summary the nightly run writes (stats.json at the site root):
// no queries of its own. Bars are plain HTML and CSS, so there is no chart library to load.
import './fonts';
import { CLIPS } from './data/clips';
import { POLISHES } from './data/polishes';
import { DEMO } from './systems/api';

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
  stations: Record<'polish' | 'clip' | 'share', { visited: number; skipped: number }>;
  /** Brush strokes by polish, and clips by kind. */
  polishes: Record<string, number>;
  clips: Record<string, number>;
  /** Obstacles bumped into or fallen at. */
  bumps: Record<string, number>;
  clouds_cheered: number;
  stars: number;
}

const BRAND = '#E85AA5';
const LAVENDER = '#C9A7FF';
const STATION_NAMES = { polish: 'Kynsien lakkaus', clip: 'Harjaklipsit', share: 'Kuppikakun jakaminen' } as const;
const OBSTACLE_NAMES: Record<string, string> = { diamond: 'Jalokivi', rainbow: 'Sateenkaari', river: 'Timanttijoki', porridge: 'Puurokulho' };
const CLIP_NAMES: Record<string, string> = { heart: 'Sydän', star: 'Tähti', bow: 'Rusetti', flower: 'Kukka', gem: 'Timantti' };
const CLIP_COLORS: Record<string, string> = { heart: '#ff4f9a', star: '#ffc94a', bow: '#ff4f9a', flower: '#b98aff', gem: '#6fd0ff' };

const fmt = (n: number) => n.toLocaleString('fi-FI');
const pct = (part: number, all: number) => (all ? `${Math.round((100 * part) / all)} %` : '–');
const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

function el(tag: string, cls = '', text = ''): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function tile(value: string, label: string): void {
  const t = el('div', 'tile');
  t.append(el('b', '', value), el('span', '', label));
  $('.tiles').append(t);
}

interface Bar {
  label: string;
  value: number;
  /** Shown after the bar instead of the plain value. */
  text?: string;
  color?: string;
}

/** One card: a title and horizontal bars, each with its label and number as text (readable without the bars). */
function card(title: string, bars: Bar[], wide = false): void {
  const c = el('section', wide ? 'card wide' : 'card');
  c.append(el('h2', '', title));
  const max = Math.max(1, ...bars.map((b) => b.value));
  for (const b of bars) {
    const row = el('div', 'bar');
    const track = el('div', 'track');
    const fill = el('i');
    fill.style.width = `${(100 * b.value) / max}%`;
    fill.style.background = b.color ?? BRAND;
    track.append(fill);
    row.append(el('span', 'label', b.label), track, el('span', 'value', b.text ?? fmt(b.value)));
    c.append(row);
  }
  if (!bars.length) c.append(el('p', 'empty', 'Ei vielä dataa.'));
  $('.grid').append(c);
}

const byCount = (table: Record<string, number>) => Object.entries(table).sort((a, b) => b[1] - a[1]);

function render(s: Summary): void {
  const g = s.games;
  tile(fmt(g.started), 'pelikertaa');
  tile(fmt(s.players_recent), `pelaajaa, ${s.recent_days} pv`);
  tile(pct(g.home, g.started), 'pääsi kotiin asti');
  tile(`${Math.floor(g.median_duration_s / 60)} min ${g.median_duration_s % 60} s`, 'pelin kesto, mediaani');
  tile(fmt(g.median_score), 'kimallusta, mediaani');
  tile(fmt(s.clouds_cheered), 'pilveä ilahdutettu');

  card(
    'Pelit päivittäin',
    s.days.map((d) => ({ label: d.day.slice(8) + '.' + d.day.slice(5, 7) + '.', value: d.started, text: `${fmt(d.started)}, kotiin ${fmt(d.home)}` })),
    true,
  );
  card(
    'Korkein saavutettu taso',
    ['1', '2', '3'].map((level) => ({ label: '★'.repeat(Number(level)), value: s.highest_level[level] ?? 0, color: '#ffc94a' })),
  );
  card(
    'Rauhoittumispisteet: käytiin vai hypättiin yli',
    (Object.keys(STATION_NAMES) as (keyof typeof STATION_NAMES)[]).map((id) => {
      const { visited, skipped } = s.stations[id];
      return { label: STATION_NAMES[id], value: visited, text: `${fmt(visited)} (${pct(visited, visited + skipped)})`, color: LAVENDER };
    }),
  );
  // Polishes and clips are drawn in their own colours, as in the game.
  card(
    'Suosituimmat kynsilakat',
    byCount(s.polishes).map(([id, value]) => {
      const polish = POLISHES.find((p) => p.id === id);
      return { label: polish?.name ?? id, value, color: polish?.color };
    }),
  );
  card(
    'Suosituimmat klipsit',
    byCount(s.clips)
      .filter(([id]) => (CLIPS as readonly string[]).includes(id))
      .map(([id, value]) => ({ label: CLIP_NAMES[id] ?? id, value, color: CLIP_COLORS[id] })),
  );
  card('Mihin esteeseen kompastuttiin', byCount(s.bumps).map(([id, value]) => ({ label: OBSTACLE_NAMES[id] ?? id, value })), true);

  $('footer').textContent = `Päivitetty ${new Date(s.generated).toLocaleString('fi-FI')}. Tähtiä kerätty yhteensä ${fmt(s.stars)}.`;
  for (const sel of ['.tiles', '.grid', 'footer']) $(sel).hidden = false;
}

async function load(): Promise<void> {
  const status = $('.status');
  if (DEMO) {
    const { DEMO_SUMMARY } = await import('./stats-demo');
    status.textContent = 'Esimerkkidataa: luvut ovat keksittyjä ja näyttävät vain, miltä sivu tulee näyttämään.';
    status.classList.add('demo');
    render(DEMO_SUMMARY);
    return;
  }
  let summary: Summary;
  try {
    const res = await fetch('../stats.json');
    if (!res.ok) return; // the page keeps saying that numbers are on their way
    summary = (await res.json()) as Summary;
  } catch {
    return;
  }
  status.hidden = true;
  render(summary);
}
void load();
