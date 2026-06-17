/**
 * Wake phrases — start Marble by voice (e.g. "Hey Mirror" / "Hoi Marble").
 */
const WakeWord = (() => {
  const PATTERNS = {
    nl: [
      /hoi\s+marble/,
      /hey\s+marble/,
      /hey\s+mirror/,
      /ha\s+marble/,
      /hoi\s+spiegel/,
      /hey\s+spiegel/,
      /he\s+marble/,
    ],
    en: [
      /hey\s+marble/,
      /hey\s+mirror/,
      /hi\s+marble/,
      /hi\s+mirror/,
      /hello\s+marble/,
    ],
    es: [
      /hola\s+marble/,
      /oye\s+marble/,
      /hey\s+marble/,
      /hey\s+mirror/,
      /hola\s+espejo/,
    ],
  };

  function normalize(text) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function matches(text) {
    const t = normalize(text);
    if (!t) return false;
    const patterns = PATTERNS[I18n.getLang()] || PATTERNS.nl;
    return patterns.some((p) => p.test(t));
  }

  function getPhrases() {
    const examples = {
      nl: 'Hoi Marble',
      en: 'Hey Mirror',
      es: 'Hola Marble',
    };
    return examples[I18n.getLang()] || examples.nl;
  }

  return { matches, getPhrases };
})();
