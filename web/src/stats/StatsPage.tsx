import { BarCard } from './BarCard';
import { fmt, toCards, toTiles } from './summary';
import { useSummary } from './useSummary';

/** The dashboard below the static page header. It only draws the nightly summary: no queries of its own. */
export function StatsPage({ demo }: { demo: boolean }) {
  const state = useSummary(demo);

  if (state.status !== 'ready') {
    return (
      <div className="status" role="status" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' ? 'Haetaan tilastoja…' : 'Tilastot tulevat näkyviin, kun peli on julkaistu ja sitä on pelattu.'}
      </div>
    );
  }

  const { summary } = state;
  return (
    <>
      {state.demo && (
        <p className="status demo">Esimerkkidataa: luvut ovat keksittyjä ja näyttävät vain, miltä sivu tulee näyttämään.</p>
      )}
      <section className="tiles" aria-label="Tärkeimmät luvut">
        {toTiles(summary).map((t) => (
          <div className="tile" key={t.label}>
            <b>{t.value}</b>
            <span>{t.label}</span>
          </div>
        ))}
      </section>
      <div className="grid">
        {toCards(summary).map((card) => (
          <BarCard key={card.title} {...card} />
        ))}
      </div>
      <footer>
        Päivitetty {new Date(summary.generated).toLocaleString('fi-FI')}. Tähtiä kerätty yhteensä {fmt(summary.stars)}.
      </footer>
    </>
  );
}
