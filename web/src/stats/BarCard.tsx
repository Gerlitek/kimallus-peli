import { useId } from 'react';
import { fmt, type CardData } from './summary';

const BRAND = '#E85AA5';

/** A card of horizontal bars. Each row has its label and number as text, so the card reads the same without the bars. */
export function BarCard({ title, bars, wide = false }: CardData) {
  const headingId = useId();
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <section className={wide ? 'card wide' : 'card'} aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      {bars.length === 0 ? (
        <p className="empty">Ei vielä dataa.</p>
      ) : (
        <ul className="bars">
          {bars.map((b) => (
            <li className="bar" key={b.label}>
              <span className="label">{b.label}</span>
              <span className="track" aria-hidden="true">
                <i style={{ width: `${(100 * b.value) / max}%`, background: b.color ?? BRAND }} />
              </span>
              <span className="value">{b.text ?? fmt(b.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
