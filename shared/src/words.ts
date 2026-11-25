/**
 * Word lists for player names. A name is three words, short enough to read aloud to a child and to remember:
 * a describing word, a compound of two theme words, and who it is, e.g. "Säihkyvä Tähtisydän Yksisarvinen".
 * Only the indexes are stored, never free text. Add new words at the end, so stored names keep their meaning.
 */
export const NAME_WORDS = {
  look: [
    'Kimalteleva', 'Säihkyvä', 'Hohtava', 'Tuikkiva', 'Loistava', 'Välkehtivä', 'Kimmeltävä', 'Hehkuva', 'Kiiltävä', 'Sädehtivä',
    'Timanttinen', 'Tähtikirkas', 'Helmeilevä', 'Pinkki', 'Pehmoinen', 'Suloinen', 'Söpö', 'Pörröinen', 'Kultainen', 'Hopeinen',
    'Lempeä', 'Iloinen', 'Hellä', 'Ihana', 'Pikkuinen', 'Hempeä', 'Kiltti', 'Untuvainen', 'Säteilevä', 'Unelmoiva',
  ],
  /** Used twice, as the two halves of a compound word such as "Tähtisydän". */
  theme: [
    'Sateenkaari', 'Tähti', 'Sydän', 'Kimallus', 'Timantti', 'Helmi', 'Pilvi', 'Kuu', 'Unelma', 'Satu',
    'Kukka', 'Taika', 'Ruusu', 'Hali', 'Lumi', 'Aurinko', 'Laulu', 'Pisara', 'Hohde', 'Kulta',
  ],
  who: [
    'Yksisarvinen', 'Kissa', 'Prinsessa', 'Keiju', 'Pupu', 'Poni', 'Kissanpentu', 'Tähtönen', 'Enkeli', 'Perhonen',
    'Merenneito', 'Nalle', 'Karitsa', 'Varsa', 'Siili', 'Orava', 'Pöllö', 'Joutsen', 'Delfiini', 'Koiranpentu',
  ],
} as const;
