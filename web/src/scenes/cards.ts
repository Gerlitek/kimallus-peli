/**
 * Cards over the game. No prompts to read or decode: the game starts on any key or tap,
 * and calm moments continue by themselves. Only a small hint for grown-ups at the bottom edge.
 */

const ADULT_HINT = '<p class="adult-hint">Aloita: välilyönti tai napautus</p>';

export function playCard(): string {
  return ADULT_HINT;
}

export function fallCard(score: number, record: boolean): string {
  const star = record ? '<span class="record" aria-label="Uusi ennätys">★</span>' : '';
  return `<div class="card icon"><div class="score-big" aria-label="${score} kimallusta"><i class="lumen"></i>${score}${star}</div></div>${ADULT_HINT}`;
}
