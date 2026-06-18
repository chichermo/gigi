/**
 * Capa de voz gratuita — Web Speech API (multilingüe + optimizado móvil).
 */
const MarbleVoice = (() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const FEMALE_ONLY_KEY = 'mirror-voice-female-only';
  const PHONE_ONLY_KEY = 'mirror-voice-phone-only';
  const LEGACY_FEMALE_KEY = 'marble-voice-female-only';
  const LEGACY_PHONE_KEY = 'marble-voice-phone-only';

  let recognition = null;
  let wakeRecognition = null;
  let wakeActive = false;
  let onWake = null;
  let synth = window.speechSynthesis;
  let selectedVoice = null;
  let isListening = false;
  let isSpeaking = false;
  let muted = false;
  let femaleOnlyFilter = (localStorage.getItem(FEMALE_ONLY_KEY) ?? localStorage.getItem(LEGACY_FEMALE_KEY)) !== 'false';
  let phoneOnlyFilter = localStorage.getItem(PHONE_ONLY_KEY) ?? localStorage.getItem(LEGACY_PHONE_KEY);
  let onResult = null;
  let onStatusChange = null;
  let onVoicesReady = null;

  const DUTCH_FEMALE_HINTS = [
    'hanna', 'colette', 'fleur', 'claire', 'ellen', 'marieke', 'lotte', 'nathalie',
    'zoe', 'mona', 'ilse', 'ingrid', 'petra', 'yvonne', 'nicole', 'anna', 'laura',
    'sanne', 'robin', 'aylin', 'xander', 'maarten', 'ruben', 'arnaud', 'dirk',
    'vrouw', 'female', 'woman',
  ];

  const DUTCH_MALE_HINTS = [
    'maarten', 'xander', 'arnaud', 'dirk', 'ruben', 'tom', 'frank', 'peter',
    'jeroen', 'bart', 'koen', 'stefan', 'thomas', 'male', 'man', 'homme',
  ];

  const FEMALE_VOICE_HINTS = [
    'helena', 'sabina', 'monica', 'paulina', 'luciana', 'laura', 'elena',
    'sofia', 'maria', 'carmen', 'isabel', 'hanna', 'colette', 'fleur',
    'zira', 'susan', 'samantha', 'jenny', 'aria', 'karen', 'claire', 'nicky',
    'natasha', 'hazel', 'elsie', 'sonia', 'libby', 'katja', 'amala',
    'lena', 'tanja', 'hortense', 'julie', 'virginie', 'elsa', 'ingrid',
    'anna', 'petra', 'yvonne', 'nicole', 'aylin', 'emel', 'sibel',
    'moira', 'tessa', 'veena', 'female', 'mujer', 'woman', 'vrouw', 'femme',
    ...DUTCH_FEMALE_HINTS,
  ];

  const MALE_VOICE_HINTS = [
    'pablo', 'jorge', 'diego', 'raul', 'carlos', 'david', 'mark', 'george',
    'james', 'daniel', 'male', 'hombre', 'man', 'homme', 'thomas', 'stefan',
    'rishi', 'guy', 'ryan', 'brian', 'frank', 'richard', 'paul', 'xander',
    'aaron', 'fred', 'arthur', 'gordon',
    ...DUTCH_MALE_HINTS,
  ];

  /** Stemmen die meestal natuurlijker klinken (neural / premium / Google). */
  const NATURAL_VOICE_HINTS = [
    'neural', 'natural', 'premium', 'enhanced', 'wavenet', 'online-n', 'online_n',
    'google nederlands', 'google dutch', 'google nl', 'siri', 'eloquence',
    'maarten online', 'colette online', 'fleur online', 'hanna online',
  ];

  const ROBOTIC_VOICE_HINTS = [
    'espeak', 'festival', 'mbrola', 'pico', 'android tts', 'sapi4',
  ];

  const PREFERRED_NATURAL_NL = [
    'google nederlands', 'google dutch', 'colette', 'maarten', 'fleur', 'hanna',
    'ellen', 'xander', 'arnaud', 'neural', 'natural', 'premium', 'nl-be', 'nl-nl',
    'microsoft colette', 'microsoft maarten', 'microsoft hanna', 'microsoft ellen',
    'zoe', 'nathalie', 'lotte', 'marieke', 'ilse', 'mona',
  ];

  const PREFERRED_FEMALE = {
    es: ['helena', 'sabina', 'monica', 'paulina', 'laura', 'elvira', 'lucia'],
    en: ['zira', 'jenny', 'samantha', 'susan', 'aria', 'hazel', 'libby', 'sonia', 'nicky'],
    nl: [
      'hanna', 'colette', 'fleur', 'claire', 'ellen', 'marieke', 'lotte', 'nathalie',
      'zoe', 'mona', 'ilse', 'nederlands', 'dutch', 'vlaams', 'flemish', 'belgian',
      'nl-be', 'nl-nl',
    ],
  };

  const MOBILE_PREFERRED_FEMALE = {
    es: ['google español', 'google spanish', 'sabina', 'paulina', 'monica', 'helena'],
    en: ['samantha', 'nicky', 'karen', 'google us english', 'google uk english'],
    nl: [
      'google nederlands', 'google dutch', 'hanna', 'colette', 'claire', 'fleur', 'ellen',
      'zoe', 'nathalie', 'nl-be', 'vlaams', 'belgian dutch',
    ],
  };

  const EXCLUDED_NON_DUTCH_HINTS = [
    'india', 'indian', 'hindi', 'hungarian', 'magyar', 'veena', 'lekha', 'rishi',
    'kanya', 'aditi', 'tamil', 'telugu', 'bengali', 'punjabi', 'gujarati',
    'marathi', 'malayalam', 'kannada', 'arabic', 'hebrew', 'turkish', 'polish',
    'czech', 'romanian', 'bulgarian', 'russian', 'ukrainian', 'greek', 'thai',
    'vietnamese', 'indonesian', 'malay', 'chinese', 'mandarin', 'cantonese',
    'japanese', 'korean', 'english', 'spanish', 'español', 'french', 'german',
    'italian', 'portuguese', 'catalan', 'danish', 'finnish', 'norwegian',
    'swedish', 'icelandic', 'persian', 'urdu', 'aylin', 'emel', 'sibel',
  ];

  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  function initPhoneFilterDefault() {
    if (phoneOnlyFilter === null) {
      phoneOnlyFilter = false;
      localStorage.setItem(PHONE_ONLY_KEY, 'false');
    } else {
      phoneOnlyFilter = phoneOnlyFilter !== 'false';
    }
  }

  function voiceStorageKey() {
    return `mirror-voice-uri-${I18n.getLang()}`;
  }

  function legacyVoiceStorageKey() {
    return `marble-voice-uri-${I18n.getLang()}`;
  }

  function voiceLabel(voice) {
    return `${voice.name} ${voice.voiceURI}`.toLowerCase();
  }

  function matchesAppLang(voice) {
    const prefix = I18n.getVoicePrefix();
    return voice.lang.toLowerCase().replace('_', '-').startsWith(prefix);
  }

  function isNativeDutchVoice(voice) {
    const lang = voice.lang.toLowerCase().replace('_', '-');
    if (!lang.startsWith('nl')) return false;
    const label = voiceLabel(voice);
    return !EXCLUDED_NON_DUTCH_HINTS.some((hint) => label.includes(hint));
  }

  function isNlNLVoice(voice) {
    const lang = voice.lang.toLowerCase().replace('_', '-');
    return lang === 'nl-nl' || lang.startsWith('nl-nl');
  }

  function isFlemishVoice(voice) {
    const lang = voice.lang.toLowerCase().replace('_', '-');
    const label = voiceLabel(voice);
    if (lang === 'nl-be' || lang.startsWith('nl-be')) return true;
    return label.includes('vlaams') || label.includes('flemish') || label.includes('belgian');
  }

  function getDutchRegion(voice) {
    if (isFlemishVoice(voice)) return 'be';
    if (isNlNLVoice(voice)) return 'nl';
    if (voice.lang.toLowerCase().startsWith('nl')) return 'nl';
    return 'other';
  }

  function isValidVoiceForApp(voice) {
    if (I18n.getLang() === 'nl') return isNativeDutchVoice(voice);
    return matchesAppLang(voice) || !femaleOnlyFilter;
  }

  function isDesktopOnlyVoice(voice) {
    const label = voiceLabel(voice);
    if (I18n.getLang() === 'nl' && !isMobileDevice()) {
      return label.includes('desktop') && !label.includes('microsoft');
    }
    return label.includes('desktop') || label.includes('win32-sapi');
  }

  function naturalnessScore(voice) {
    const label = voiceLabel(voice);
    let score = 0;

    PREFERRED_NATURAL_NL.forEach((hint, i) => {
      if (label.includes(hint)) score = Math.max(score, 140 - i);
    });

    NATURAL_VOICE_HINTS.forEach((hint, i) => {
      if (label.includes(hint)) score = Math.max(score, 90 - i);
    });

    ROBOTIC_VOICE_HINTS.forEach((hint) => {
      if (label.includes(hint)) score -= 50;
    });

    if (voice.localService) score += 12;
    if (I18n.getLang() === 'nl' && isNativeDutchVoice(voice)) score += 20;
    if (isFlemishVoice(voice)) score += 8;
    if (isNlNLVoice(voice)) score += 8;

    return score;
  }

  function isNaturalVoice(voice) {
    return naturalnessScore(voice) >= 60;
  }

  function isPhoneUsableVoice(voice) {
    if (isDesktopOnlyVoice(voice)) return false;
    if (isMobileDevice()) return true;
    if (voice.localService) return true;
    const label = voiceLabel(voice);
    return (
      label.includes('google') ||
      label.includes('samsung') ||
      label.includes('apple') ||
      label.includes('iphone') ||
      label.includes('android') ||
      label.includes('com.apple') ||
      label.includes('com.google')
    );
  }

  function isMaleVoice(voice) {
    const label = voiceLabel(voice);
    return MALE_VOICE_HINTS.some((hint) => label.includes(hint));
  }

  function isFemaleVoice(voice) {
    if (isMaleVoice(voice)) return false;
    const label = voiceLabel(voice);
    return FEMALE_VOICE_HINTS.some((hint) => label.includes(hint));
  }

  function femaleVoiceScore(voice) {
    if (isMaleVoice(voice)) return -100;

    const label = voiceLabel(voice);
    const preferred = PREFERRED_FEMALE[I18n.getLang()] || [];
    const mobilePreferred = MOBILE_PREFERRED_FEMALE[I18n.getLang()] || [];
    let score = naturalnessScore(voice);

    if (isMobileDevice() || phoneOnlyFilter) {
      for (let i = 0; i < mobilePreferred.length; i++) {
        if (label.includes(mobilePreferred[i])) score = Math.max(score, 120 - i);
      }
    }

    for (let i = 0; i < preferred.length; i++) {
      if (label.includes(preferred[i])) score = Math.max(score, 100 - i);
    }
    if (isFemaleVoice(voice)) score = Math.max(score, 50);
    if (matchesAppLang(voice)) score += 30;
    if (I18n.getLang() === 'nl' && isNativeDutchVoice(voice)) score += 40;
    if (I18n.getLang() === 'nl' && isNlNLVoice(voice)) score += 15;
    if (I18n.getLang() === 'nl' && isFlemishVoice(voice)) score += 15;
    if (isMobileDevice() && voice.localService) score += 25;
    if (isPhoneUsableVoice(voice)) score += 15;
    return score;
  }

  function voiceRankScore(voice) {
    if (I18n.getLang() !== 'nl') return femaleVoiceScore(voice);
    let score = naturalnessScore(voice) * 2 + femaleVoiceScore(voice);
    if (femaleOnlyFilter && isMaleVoice(voice)) score -= 200;
    return score;
  }

  function getAllVoices() {
    return synth.getVoices();
  }

  function getPickerPool() {
    const all = getAllVoices();
    let pool = all;

    if (I18n.getLang() === 'nl') {
      pool = pool.filter(isNativeDutchVoice);
      if (phoneOnlyFilter) {
        const phonePool = pool.filter((v) => isPhoneUsableVoice(v));
        if (phonePool.length > 0) pool = phonePool;
      }
      return pool;
    }

    if (phoneOnlyFilter) {
      pool = pool.filter((v) => isPhoneUsableVoice(v));
    }

    if (femaleOnlyFilter) {
      pool = pool.filter((v) => {
        if (isMaleVoice(v)) return false;
        return isFemaleVoice(v) || matchesAppLang(v);
      });
    } else {
      const langVoices = pool.filter((v) => matchesAppLang(v));
      const extraFemale = pool.filter((v) => isFemaleVoice(v) && !matchesAppLang(v));
      const merged = [...langVoices];
      extraFemale.forEach((v) => {
        if (!merged.some((m) => m.voiceURI === v.voiceURI)) merged.push(v);
      });
      pool = merged.length > 0 ? merged : pool;
    }

    return pool.length > 0 ? pool : all.filter((v) => !isDesktopOnlyVoice(v));
  }

  function getVoicesForPicker() {
    const locale = I18n.getLang();
    const regionOrder = { be: 0, nl: 1, other: 2 };
    return getPickerPool()
      .map((voice) => ({
        voice,
        voiceURI: voice.voiceURI,
        label: formatVoiceLabel(voice),
        score: voiceRankScore(voice),
        naturalness: naturalnessScore(voice),
        isNatural: isNaturalVoice(voice),
        isFemale: isFemaleVoice(voice),
        langMatch: matchesAppLang(voice),
        onPhone: isMobileDevice() || isPhoneUsableVoice(voice),
        dutchRegion: getDutchRegion(voice),
      }))
      .sort((a, b) => {
        if (I18n.getLang() === 'nl' && a.isNatural !== b.isNatural) {
          return a.isNatural ? -1 : 1;
        }
        if (I18n.getLang() === 'nl' && a.dutchRegion !== b.dutchRegion) {
          return (regionOrder[a.dutchRegion] ?? 2) - (regionOrder[b.dutchRegion] ?? 2);
        }
        if (b.score !== a.score) return b.score - a.score;
        if (a.langMatch !== b.langMatch) return a.langMatch ? -1 : 1;
        return a.label.localeCompare(b.label, locale);
      });
  }

  function formatVoiceLabel(voice) {
    const gender = isFemaleVoice(voice) ? '♀ ' : isMaleVoice(voice) ? '♂ ' : '◦ ';
    let region = '';
    let quality = '';
    if (I18n.getLang() === 'nl') {
      const r = getDutchRegion(voice);
      if (r === 'be') region = ` · ${I18n.t('voiceRegionBE')}`;
      else if (r === 'nl') region = ` · ${I18n.t('voiceRegionNL')}`;
      quality = isNaturalVoice(voice)
        ? ` · ${I18n.t('voiceQualityNatural')}`
        : ` · ${I18n.t('voiceQualityStandard')}`;
    }
    const local = voice.localService ? '' : I18n.t('voiceOnline');
    return `${gender}${voice.name} — ${voice.lang}${region}${quality}${local}`;
  }

  function pickDefaultVoice() {
    const ranked = [...getPickerPool()].sort((a, b) => voiceRankScore(b) - voiceRankScore(a));
    const bestNaturalFemale = ranked.find((v) => isNaturalVoice(v) && isFemaleVoice(v) && voiceRankScore(v) > 0);
    if (bestNaturalFemale) return bestNaturalFemale;
    const bestFemale = ranked.find((v) => isFemaleVoice(v) && voiceRankScore(v) > 0);
    if (bestFemale) return bestFemale;
    const bestNatural = ranked.find((v) => isNaturalVoice(v));
    if (bestNatural) return bestNatural;
    const bestScored = ranked.find((v) => voiceRankScore(v) > 0);
    return bestScored || ranked.find((v) => !isMaleVoice(v)) || ranked[0] || null;
  }

  function getFriendlyTone() {
    const female = selectedVoice && (isFemaleVoice(selectedVoice) || !isMaleVoice(selectedVoice));
    if (I18n.getLang() === 'nl' && selectedVoice) {
      const label = voiceLabel(selectedVoice);
      if (isNaturalVoice(selectedVoice)) {
        return { rate: female ? 0.91 : 0.93, pitch: 1.0 };
      }
      if (label.includes('google')) {
        return { rate: female ? 0.89 : 0.91, pitch: 1.02 };
      }
      return { rate: female ? 0.87 : 0.89, pitch: female ? 1.02 : 1.04 };
    }
    if (I18n.getLang() === 'nl') {
      return { rate: female ? 0.88 : 0.90, pitch: female ? 1.02 : 1.04 };
    }
    return {
      rate: female ? 0.98 : 1.0,
      pitch: female ? 1.1 : 1.12,
    };
  }

  let speakQueueToken = 0;

  function speakChunks(chunks, onDone, token) {
    if (token !== speakQueueToken) return;

    if (!chunks.length) {
      isSpeaking = false;
      notifyStatus('idle');
      if (onDone) onDone();
      return;
    }

    const [next, ...rest] = chunks;
    const utterance = new SpeechSynthesisUtterance(next);
    const tone = getFriendlyTone();
    utterance.lang = selectedVoice?.lang || I18n.getSpeechLang();
    utterance.rate = tone.rate;
    utterance.pitch = tone.pitch;
    utterance.volume = 1;
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onstart = () => {
      isSpeaking = true;
      notifyStatus('speaking');
    };

    utterance.onend = () => {
      if (token !== speakQueueToken) return;
      if (rest.length) {
        setTimeout(() => speakChunks(rest, onDone, token), 180);
      } else {
        isSpeaking = false;
        notifyStatus('idle');
        if (onDone) onDone();
      }
    };

    utterance.onerror = () => {
      if (token !== speakQueueToken) return;
      isSpeaking = false;
      notifyStatus('idle');
      if (onDone) onDone();
    };

    synth.speak(utterance);
  }

  function setUserName(name) {
    if (typeof TtsPrep !== 'undefined') TtsPrep.setUserName(name);
  }

  function loadSavedVoice() {
    const savedUri = localStorage.getItem(voiceStorageKey())
      || localStorage.getItem(legacyVoiceStorageKey());
    const voices = getAllVoices();

    if (savedUri) {
      const saved = voices.find((v) => v.voiceURI === savedUri);
      if (
        saved
        && isValidVoiceForApp(saved)
        && (!phoneOnlyFilter || isPhoneUsableVoice(saved))
      ) {
        selectedVoice = saved;
        return;
      }
    }

    selectedVoice = pickDefaultVoice();
    if (selectedVoice) {
      localStorage.setItem(voiceStorageKey(), selectedVoice.voiceURI);
    }
  }

  function notifyVoicesReady() {
    if (onVoicesReady) onVoicesReady(getVoicesForPicker(), selectedVoice);
  }

  function updateRecognitionLang() {
    if (recognition) recognition.lang = I18n.getSpeechLang();
  }

  function init() {
    initPhoneFilterDefault();
    loadSavedVoice();
    setupRecognition();
    setupWakeRecognition();

    const refreshVoices = () => {
      loadSavedVoice();
      notifyVoicesReady();
    };

    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = refreshVoices;
    }

    refreshVoices();
    [250, 1000, 2500, 5000].forEach((ms) => setTimeout(refreshVoices, ms));
  }

  function setLanguage() {
    updateRecognitionLang();
    if (wakeRecognition) wakeRecognition.lang = I18n.getSpeechLang();
    loadSavedVoice();
    notifyVoicesReady();
  }

  function setFemaleOnlyFilter(value) {
    femaleOnlyFilter = !!value;
    localStorage.setItem(FEMALE_ONLY_KEY, femaleOnlyFilter ? 'true' : 'false');
    loadSavedVoice();
    notifyVoicesReady();
  }

  function setPhoneOnlyFilter(value) {
    phoneOnlyFilter = !!value;
    localStorage.setItem(PHONE_ONLY_KEY, phoneOnlyFilter ? 'true' : 'false');
    loadSavedVoice();
    notifyVoicesReady();
  }

  function getFemaleOnlyFilter() {
    return femaleOnlyFilter;
  }

  function getPhoneOnlyFilter() {
    return phoneOnlyFilter;
  }

  function getMobileInfo() {
    return {
      isMobile: isMobileDevice(),
      isIOS: isIOS(),
      isAndroid: isAndroid(),
      guideKey: isIOS() ? 'voiceMobileIOSGuide' : isAndroid() ? 'voiceMobileAndroidGuide' : 'voiceMobileDesktopNote',
    };
  }

  function setVoice(voiceURI) {
    const voice = getAllVoices().find((v) => v.voiceURI === voiceURI);
    if (!voice) return false;
    if (!isValidVoiceForApp(voice)) return false;
    if (phoneOnlyFilter && !isPhoneUsableVoice(voice)) return false;

    selectedVoice = voice;
    localStorage.setItem(voiceStorageKey(), voice.voiceURI);
    notifyVoicesReady();
    return true;
  }

  function getSelectedVoice() {
    return selectedVoice;
  }

  function previewVoice(text) {
    speak(text || I18n.t('voicePreview'));
  }

  function previewVoiceUri(voiceURI, text) {
    const prev = selectedVoice;
    const voice = getAllVoices().find((v) => v.voiceURI === voiceURI);
    if (!voice) return;
    selectedVoice = voice;
    speak(text || I18n.t('voicePreview'), () => {
      selectedVoice = prev;
    });
  }

  function setupWakeRecognition() {
    if (!SpeechRecognition) return;

    wakeRecognition = new SpeechRecognition();
    wakeRecognition.lang = I18n.getSpeechLang();
    wakeRecognition.continuous = true;
    wakeRecognition.interimResults = true;
    wakeRecognition.maxAlternatives = 1;

    wakeRecognition.onresult = (event) => {
      let chunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        chunk += event.results[i][0].transcript;
      }
      if (typeof WakeWord !== 'undefined' && WakeWord.matches(chunk)) {
        stopWakeListening();
        if (onWake) onWake();
      }
    };

    wakeRecognition.onend = () => {
      if (wakeActive && !isSpeaking) {
        setTimeout(() => {
          if (!wakeActive) return;
          try { wakeRecognition.start(); } catch { /* noop */ }
        }, 350);
      }
    };

    wakeRecognition.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      if (wakeActive) {
        setTimeout(() => {
          if (!wakeActive) return;
          try { wakeRecognition.start(); } catch { /* noop */ }
        }, 800);
      }
    };
  }

  function startWakeListening(callback) {
    if (!wakeRecognition || wakeActive || isSpeaking) return false;
    onWake = callback;
    wakeActive = true;
    notifyStatus('wake');
    try {
      wakeRecognition.lang = I18n.getSpeechLang();
      wakeRecognition.start();
      return true;
    } catch {
      wakeActive = false;
      notifyStatus('idle');
      return false;
    }
  }

  function stopWakeListening() {
    wakeActive = false;
    onWake = null;
    if (wakeRecognition) {
      try { wakeRecognition.stop(); } catch { /* noop */ }
    }
  }

  function setupRecognition() {
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.lang = I18n.getSpeechLang();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (onResult) onResult({ interim, final });
    };

    recognition.onend = () => {
      isListening = false;
      notifyStatus('idle');
    };

    recognition.onerror = (event) => {
      isListening = false;
      if (event.error === 'no-speech') {
        notifyStatus('idle');
        return;
      }
      if (event.error === 'aborted') return;
      notifyStatus('error');
      if (onResult) onResult({ error: event.error });
    };

    recognition.onstart = () => {
      isListening = true;
      notifyStatus('listening');
    };
  }

  function notifyStatus(status) {
    if (onStatusChange) onStatusChange(status);
  }

  function speak(text, onDone) {
    if (muted || !text) {
      if (onDone) onDone();
      return;
    }

    synth.cancel();
    speakQueueToken += 1;
    const token = speakQueueToken;

    const lang = I18n.getLang();
    const prepared = typeof TtsPrep !== 'undefined' ? TtsPrep.prepare(lang, text) : text;
    const chunks = (typeof TtsPrep !== 'undefined' && TtsPrep.shouldChunk(lang, prepared))
      ? TtsPrep.chunkSentences(prepared)
      : [prepared];

    speakChunks(chunks, onDone, token);
  }

  function listen() {
    if (!recognition || isListening || isSpeaking) return false;
    try {
      recognition.start();
      return true;
    } catch {
      return false;
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      try { recognition.stop(); } catch { /* noop */ }
    }
  }

  function stopSpeaking() {
    speakQueueToken += 1;
    synth.cancel();
    isSpeaking = false;
    notifyStatus('idle');
  }

  function setMuted(val) {
    muted = val;
    if (muted) stopSpeaking();
  }

  function isSupported() {
    return !!(SpeechRecognition && synth);
  }

  function getSupportMessage() {
    if (!SpeechRecognition && !synth) return I18n.t('supportNoSpeech');
    if (!SpeechRecognition) return I18n.t('supportNoSTT');
    if (!synth) return I18n.t('supportNoTTS');
    return null;
  }

  function hasVoiceCatalog() {
    return getAllVoices().length > 0;
  }

  return {
    init,
    setLanguage,
    speak,
    hasVoiceCatalog,
    listen,
    stopListening,
    startWakeListening,
    stopWakeListening,
    stopSpeaking,
    setMuted,
    setVoice,
    setFemaleOnlyFilter,
    setPhoneOnlyFilter,
    getFemaleOnlyFilter,
    getPhoneOnlyFilter,
    getMobileInfo,
    getSelectedVoice,
    getVoicesForPicker,
    setUserName,
    previewVoice,
    previewVoiceUri,
    isSupported,
    getSupportMessage,
    get isListening() { return isListening; },
    get isWakeListening() { return wakeActive; },
    get isSpeaking() { return isSpeaking; },
    set onResult(fn) { onResult = fn; },
    set onStatusChange(fn) { onStatusChange = fn; },
    set onVoicesReady(fn) { onVoicesReady = fn; },
  };
})();
