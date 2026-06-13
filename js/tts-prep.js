/**
 * Voorbereiding van tekst voor spraaksynthese — vooral natuurlijk Nederlands.
 */
const TtsPrep = (() => {
  const NL_COLOR_ADJ = new Set([
    'rood', 'oranje', 'geel', 'groen', 'blauw', 'paars', 'roze', 'bruin',
    'zwart', 'wit', 'grijs', 'beige', 'marineblauw', 'blauwgroen', 'koraal',
  ]);

  const NL_REPLACEMENTS = [
    [/\bvibe(s)?\b/gi, 'uitstraling'],
    [/\bflow\b/gi, 'samenhang'],
    [/\bclean\b/gi, 'verzorgd'],
    [/\boutfit\b/gi, 'kleding'],
    [/\blook\b/gi, 'stijl'],
    [/\btenue\b/gi, 'kleding'],
    [/\boverdressed\b/gi, 'overdreven'],
    [/\s*—\s*/g, ', '],
    [/\s+-\s+/g, ', '],
    [/\s{2,}/g, ' '],
  ];

  function fixDutchArticles(text) {
    let out = text;
    NL_COLOR_ADJ.forEach((color) => {
      const reDe = new RegExp(`\\bde\\s+${color}\\b`, 'gi');
      const reHet = new RegExp(`\\bhet\\s+${color}\\b`, 'gi');
      out = out.replace(reDe, color);
      out = out.replace(reHet, color);
    });
    out = out.replace(/\bde\s+uitstraling\b/gi, 'de uitstraling');
    out = out.replace(/\bhet\s+uitstraling\b/gi, 'de uitstraling');
    out = out.replace(/\bde\s+kleding\b/gi, 'de kleding');
    out = out.replace(/\bhet\s+kleding\b/gi, 'de kleding');
    out = out.replace(/\bde\s+stijl\b/gi, 'de stijl');
    out = out.replace(/\bhet\s+stijl\b/gi, 'de stijl');
    return out;
  }

  function prepare(lang, text) {
    if (!text || lang !== 'nl') return text;

    let out = text.trim();
    NL_REPLACEMENTS.forEach(([pattern, replacement]) => {
      out = out.replace(pattern, replacement);
    });
    out = fixDutchArticles(out);
    out = out.replace(/,\s*,/g, ',');
    out = out.replace(/\s+([,.!?])/g, '$1');
    return out;
  }

  function shouldChunk(lang, text) {
    return lang === 'nl' && text.length > 140;
  }

  function chunkSentences(text) {
    const parts = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length <= 1) return [text];

    const chunks = [];
    let current = '';

    parts.forEach((part) => {
      if (!current) {
        current = part;
        return;
      }
      if ((current + ' ' + part).length <= 120) {
        current = `${current} ${part}`;
      } else {
        chunks.push(current);
        current = part;
      }
    });
    if (current) chunks.push(current);
    return chunks.length ? chunks : [text];
  }

  return { prepare, shouldChunk, chunkSentences };
})();
