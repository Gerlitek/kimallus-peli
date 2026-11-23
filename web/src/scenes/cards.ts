/**
 * Cards over the game. No prompts to read or decode: the game starts on any key or tap,
 * and calm moments continue by themselves. Only a small hint for grown-ups at the bottom edge.
 */

const ADULT_HINT = '<p class="adult-hint">Aloita: välilyönti tai napautus</p>';

export function playCard(): string {
  return ADULT_HINT;
}

/** The end of a run: the level reached as stars, a house if the ride got all the way home, and the score. */
export function endCard(score: number, record: boolean, level: number, home: boolean): string {
  const star = record ? '<span class="record" aria-label="Uusi ennätys">★</span>' : '';
  const reached = `<div class="record" aria-label="Taso ${level}${home ? ', perillä kotona' : ''}">${'★'.repeat(level)}${home ? ' 🏠' : ''}</div>`;
  return `<div class="card icon">${reached}<div class="score-big" aria-label="${score} kimallusta"><i class="lumen"></i>${score}${star}</div></div>${ADULT_HINT}`;
}
