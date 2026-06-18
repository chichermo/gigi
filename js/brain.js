/**
 * Motor conversacional de Mirror (multilingüe + anti-repetición).
 */
const MarbleBrain = (() => {
  const MIN_SECONDARY_SHARE = 0.18;
  const RECENT_MAX = 14;
  const recent = new Map();

  function brain() { return I18n.getBrain(); }
  function extra() { return PhrasePools[I18n.getLang()] || {}; }

  function poolKey(category, sub = '') {
    return sub ? `${category}:${sub}` : category;
  }

  function mergePool(category, sub = '') {
    const b = brain();
    if (sub && b.colorComments?.[sub]) {
      return [...b.colorComments[sub]];
    }
    const base = b[category];
    const baseArr = Array.isArray(base) ? base : base ? [base] : [];
    const more = sub ? [] : (extra()[category] || []);
    return [...baseArr, ...more];
  }

  function pickUnique(arr, key) {
    if (!arr?.length) return '';
    const storeKey = `${I18n.getLang()}:${key}`;
    let used = recent.get(storeKey) || [];

    let available = arr.filter((item) => !used.includes(item));
    if (!available.length) {
      used = [];
      available = arr;
    }

    const choice = available[Math.floor(Math.random() * available.length)];
    used = [...used, choice].slice(-RECENT_MAX);
    recent.set(storeKey, used);
    return choice;
  }

  function say(category, name, sub = '') {
    return fill(pickUnique(mergePool(category, sub), poolKey(category, sub)), name);
  }

  function fill(template, name) {
    return template.replace(/\{name\}/g, name);
  }

  function detectIntent(text) {
    const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const intents = brain().intents;
    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(t)) return intent;
    }
    return 'unknown';
  }

  function extractName(text) {
    const patterns = brain().namePatterns;
    const t = text.trim();
    for (const p of patterns) {
      const m = t.match(p);
      if (m) {
        let name = m[1].trim();
        name = name.replace(/[.,!?¿¡]/g, '').split(/\s+/).slice(0, 2).join(' ');
        name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        if (name.length >= 2 && name.length <= 30) return name;
      }
    }
    return null;
  }

  function generalStyleComment(name) {
    return say('styleGeneral', name);
  }

  function colorAlsoLine(color) {
    const variants = [...(extra().colorAlso || []), brain().colorAlso];
    const line = pickUnique(variants.filter(Boolean), 'colorAlso');
    return line.replace('{color}', color);
  }

  function hairComment(analysis, name) {
    const b = brain();
    const hair = analysis?.hair;

    if (!hair || hair.sampled < 25 || hair.tone === 'unknown') {
      return fill(b.hairNoView || b.colorsNoView, name);
    }

    if (hair.confidence === 'low') {
      return say('hair', name);
    }

    const comments = [
      ...(b.hairComments?.[hair.tone] || []),
      ...(b.hairComments?.default || []),
    ];
    return fill(pickUnique(comments, `hair:${hair.tone}`), name);
  }

  function makeupComment(analysis, name) {
    const b = brain();
    const makeup = analysis?.makeup;

    if (!makeup || makeup.sampled < 30 || makeup.level === 'unknown') {
      return fill(b.makeupNoView || b.colorsNoView, name);
    }

    if (makeup.confidence === 'low') {
      return say('makeup', name);
    }

    const comments = [
      ...(b.makeupComments?.[makeup.level] || []),
      ...(b.makeupComments?.default || []),
    ];
    return fill(pickUnique(comments, `makeup:${makeup.level}`), name);
  }

  function colorComment(analysis, name) {
    const b = brain();

    if (!analysis || analysis.sampled < 40) {
      return generalStyleComment(name);
    }

    if (analysis.confidence === 'low' && !analysis.hasNeutralLook) {
      return generalStyleComment(name);
    }

    const colors = analysis.dominantColors;
    if (!colors?.length) {
      return generalStyleComment(name);
    }

    if (analysis.hasNeutralLook) {
      const pool = mergePool('neutralLook').concat(b.colorComments[colors[0]] || []);
      return fill(pickUnique(pool, `neutral:${colors[0]}`), name);
    }

    const main = colors[0];
    const comments = [
      ...(b.colorComments[main] || []),
      ...(b.colorComments.default || []),
    ];
    const base = fill(pickUnique(comments, `color:${main}`), name);

    if (colors.length > 1) {
      const shares = analysis.colorShares || {};
      if ((shares[colors[1]] || 0) >= MIN_SECONDARY_SHARE) {
        const second = b.colorNames[colors[1]] || colors[1];
        return `${base} ${colorAlsoLine(second)}`;
      }
    }

    return base;
  }

  function compose(fns) {
    const list = fns.filter(Boolean);
    const fn = list[Math.floor(Math.random() * list.length)];
    return fn ? fn() : '';
  }

  function isCompactLang() {
    return I18n.getLang() === 'nl';
  }

  function respond(intent, name, analysis = null) {
    const compact = isCompactLang();

    switch (intent) {
      case 'look':
        return analysis
          ? compose(compact
            ? [
                () => say('look', name),
                () => `${say('look', name)} ${colorComment(analysis, name)}`,
                () => colorComment(analysis, name),
              ]
            : [
                () => `${say('look', name)} ${colorComment(analysis, name)}`,
                () => `${say('look', name)} ${say('compliments', name)}`,
                () => colorComment(analysis, name),
              ])
          : say('look', name);

      case 'outfit':
        return analysis
          ? compose(compact
            ? [
                () => say('outfit', name),
                () => `${say('outfit', name)} ${colorComment(analysis, name)}`,
              ]
            : [
                () => `${say('outfit', name)} ${colorComment(analysis, name)}`,
                () => `${say('outfit', name)} ${generalStyleComment(name)}`,
              ])
          : say('outfit', name);

      case 'hair':
        return analysis
          ? compose(compact
            ? [
                () => hairComment(analysis, name),
                () => `${say('hair', name)} ${hairComment(analysis, name)}`,
              ]
            : [
                () => `${say('hair', name)} ${hairComment(analysis, name)}`,
                () => hairComment(analysis, name),
              ])
          : say('hair', name);

      case 'makeup':
        return analysis
          ? compose(compact
            ? [
                () => makeupComment(analysis, name),
                () => `${say('makeup', name)} ${makeupComment(analysis, name)}`,
              ]
            : [
                () => `${say('makeup', name)} ${makeupComment(analysis, name)}`,
                () => makeupComment(analysis, name),
              ])
          : say('makeup', name);

      case 'compliment':
        return say('compliments', name);

      case 'greeting':
        return fill(brain().greetingReturn, name);

      case 'help':
        return say('help', name);

      case 'thanks':
        return say('thanks', name);

      case 'bye':
        return say('bye', name);

      case 'name':
        return fill(brain().nameReply, name);

      case 'colors':
        return analysis
          ? colorComment(analysis, name)
          : fill(brain().colorsNoView, name);

      case 'date':
        return analysis
          ? compose([
              () => `${say('date', name)} ${colorComment(analysis, name)}`,
              () => say('date', name),
            ])
          : say('date', name);

      case 'advice':
        return say('advice', name);

      case 'style_vibe':
        return analysis
          ? compose([
              () => `${say('styleVibe', name)} ${colorComment(analysis, name)}`,
              () => say('styleVibe', name),
            ])
          : say('styleVibe', name);

      case 'analyze':
        return null;

      default:
        return `${fill(brain().unknown, name)}${say('compliments', name)}`;
    }
  }

  function analyzeLook(name, analysis) {
    const useColor = analysis && analysis.confidence !== 'low';
    const colorPart = useColor ? colorComment(analysis, name) : generalStyleComment(name);
    const compact = isCompactLang();

    return compose(compact
      ? [
          () => `${say('look', name)} ${hairComment(analysis, name)}`,
          () => `${say('outfit', name)} ${makeupComment(analysis, name)}`,
          () => `${say('look', name)} ${colorPart}`,
          () => `${hairComment(analysis, name)} ${makeupComment(analysis, name)}`,
          () => `${say('look', name)} ${say('compliments', name)}`,
        ]
      : [
          () => `${say('look', name)} ${say('outfit', name)} ${hairComment(analysis, name)} ${makeupComment(analysis, name)}`,
          () => `${say('outfit', name)} ${colorPart} ${hairComment(analysis, name)}`,
          () => `${say('look', name)} ${colorPart}`,
          () => `${colorPart} ${say('compliments', name)}`,
          () => `${say('look', name)} ${say('compliments', name)}`,
        ]);
  }

  function getQuestionCategories() {
    const lang = I18n.getLang();
    return QuestionMenu[lang] || QuestionMenu.nl;
  }

  function clearRecent() {
    recent.clear();
  }

  return {
    getGreeting: () => pickUnique(brain().greetings, 'greetings'),
    getNameConfirm: (name) => fill(pickUnique(brain().nameConfirm, 'nameConfirm'), name),
    getSuggestedQuestions: () => getQuestionCategories().flatMap((c) => c.items),
    getQuestionCategories,
    detectIntent,
    extractName,
    respond,
    analyzeLook,
    clearRecent,
  };
})();
