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
  { id: 'pink-glitter', name: 'Pinkki kimalle', color: '#ff7fbf', shade: '#e0559c', glitter: ['#ffffff', '#ffe0f2', '#fff1a8'] },
  { id: 'gold-glitter', name: 'Kultakimalle', color: '#f7d774', shade: '#d6a843', metallic: true, glitter: ['#ffffff', '#fff6cf'] },
  { id: 'rainbow-glitter', name: 'Sateenkaarikimalle', color: '#ecdcff', shade: '#c8b0f0', glitter: ['#ff6fa8', '#ffe27a', '#8fe3a8', '#7fc8ff', '#b69cff', '#ffffff'] },
];
