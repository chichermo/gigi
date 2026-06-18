/**
 * Wake phrases — start Mirror by voice (e.g. "Hey Mirror" / "Hoi Mirror").
 */
const WakeWord = (() => {
  const PATTERNS = {
    nl: [
      /hoi\s+mirror/,
      /hey\s+mirror/,
      /hey\s+spiegel/,
      /hoi\s+spiegel/,
      /ha\s+mirror/,
      /he\s+mirror/,
      /hoi\s+marble/,
      /hey\s+marble/,
    ],
    en: [
      /hey\s+mirror/,
      /hi\s+mirror/,
      /hello\s+mirror/,
      /hey\s+marble/,
      /hi\s+marble/,
    ],
    es: [
      /hola\s+mirror/,
      /hey\s+mirror/,
      /hola\s+espejo/,
      /oye\s+mirror/,
      /hola\s+marble/,
      /hey\s+marble/,
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
      nl: 'Hoi Mirror',
      en: 'Hey Mirror',
      es: 'Hola Mirror',
    };
    return examples[I18n.getLang()] || examples.nl;
  }

  return { matches, getPhrases };
})();
