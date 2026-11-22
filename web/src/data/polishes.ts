export interface Polish {
  id: string;
  name: string;
  /** Main colour of the lacquer. */
  color: string;
  /** Darker edge colour, gives the lacquer depth. */
  shade: string;
  /** Metallic polishes get a bright band of reflected light. */
  metallic?: boolean;
  /** Glitter polishes get sparkling flakes in these colours. */
  glitter?: readonly string[];
}

export const POLISHES: readonly Polish[] = [
  { id: 'rose', name: 'Ruusu', color: '#ffb3d4', shade: '#f48dbb' },
  { id: 'pink', name: 'Pinkki', color: '#ff4fa0', shade: '#d82f80' },
  { id: 'red', name: 'Punainen', color: '#e8304a', shade: '#b81d36' },
  { id: 'gold', name: 'Kulta', color: '#f5cd5f', shade: '#c8902a', metallic: true },
  // Glitter polishes have their own colours, so they never look like the plain ones.
  { id: 'blue-glitter', name: 'Sininen kimalle', color: '#5fb2ff', shade: '#2f7fe0', glitter: ['#ffffff', '#d6f0ff', '#fff1a8'] },
  { id: 'mint-glitter', name: 'Minttukimalle', color: '#6fe0c0', shade: '#2fb894', glitter: ['#ffffff', '#e0fff6', '#ffe27a'] },
  { id: 'holo-glitter', name: 'Holokimalle', color: '#e6e9f5', shade: '#b8bfd8', metallic: true, glitter: ['#ff6fa8', '#ffe27a', '#8fe3a8', '#7fc8ff', '#b69cff', '#ffffff'] },
];
