/**
 * Capa de voz gratuita — Web Speech API (multilingüe + optimizado móvil).
 */
const MarbleVoice = (() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const FEMALE_ONLY_KEY = 'marble-voice-female-only';
  const PHONE_ONLY_KEY = 'marble-voice-phone-only';

  let recognition = null;
  let synth = window.speechSynthesis;
  let selectedVoice = null;
  let isListening = false;
  let isSpeaking = false;
  let muted = false;
  let femaleOnlyFilter = localStorage.getItem(FEMALE_ONLY_KEY) !== 'false';
  let phoneOnlyFilter = localStorage.getItem(PHONE_ONLY_KEY);
  let onResult = null;
  let onStatusChange = null;
  let onVoicesReady = null;

  const FEMALE_VOICE_HINTS = [
    'helena', 'sabina', 'monica', 'paulina', 'luciana', 'laura', 'elena',
    'sofia', 'maria', 'carmen', 'isabel', 'hanna', 'colette', 'fleur',
    'zira', 'susan', 'samantha', 'jenny', 'aria', 'karen', 'claire', 'nicky',
    'natasha', 'hazel', 'elsie', 'sonia', 'libby', 'katja', 'amala',
    'lena', 'tanja', 'hortense', 'julie', 'virginie', 'elsa', 'ingrid',
    'anna', 'petra', 'yvonne', 'nicole', 'aylin', 'emel', 'sibel',
    'moira', 'tessa', 'veena', 'female', 'mujer', 'woman', 'vrouw', 'femme',
  ];

  const MALE_VOICE_HINTS = [
    'pablo', 'jorge', 'diego', 'raul', 'carlos', 'david', 'mark', 'george',
    'james', 'daniel', 'male', 'hombre', 'man', 'homme', 'thomas', 'stefan',
    'rishi', 'guy', 'ryan', 'brian', 'frank', 'richard', 'paul', 'xander',
    'aaron', 'fred', 'arthur', 'gordon',
  ];

  const PREFERRED_FEMALE = {
    es: ['helena', 'sabina', 'monica', 'paulina', 'laura', 'elvira', 'lucia'],
    en: ['zira', 'jenny', 'samantha', 'susan', 'aria', 'hazel', 'libby', 'sonia', 'nicky'],
    nl: ['hanna', 'colette', 'fleur', 'claire', 'aylin', 'petra', 'lena'],
  };

  const MOBILE_PREFERRED_FEMALE = {
    es: ['google español', 'google spanish', 'sabina', 'paulina', 'monica', 'helena'],
    en: ['samantha', 'nicky', 'karen', 'google us english', 'google uk english'],
    nl: ['google nederlands', 'google dutch', 'hanna', 'colette', 'claire', 'fleur'],
  };

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
      phoneOnlyFilter = isMobileDevice();
      localStorage.setItem(PHONE_ONLY_KEY, phoneOnlyFilter ? 'true' : 'false');
    } else {
      phoneOnlyFilter = phoneOnlyFilter !== 'false';
    }
  }

  function voiceStorageKey() {
    return `marble-voice-uri-${I18n.getLang()}`;
  }

  function voiceLabel(voice) {
    return `${voice.name} ${voice.voiceURI}`.toLowerCase();
  }

  function matchesAppLang(voice) {
    const prefix = I18n.getVoicePrefix();
    return voice.lang.toLowerCase().replace('_', '-').startsWith(prefix);
  }

  function isDesktopOnlyVoice(voice) {
    const label = voiceLabel(voice);
    return label.includes('desktop') || label.includes('win32-sapi');
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
    let score = 0;

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
    if (isMobileDevice() && voice.localService) score += 25;
    if (isPhoneUsableVoice(voice)) score += 15;
    return score;
  }

  function getAllVoices() {
    return synth.getVoices();
  }

  function getPickerPool() {
    const all = getAllVoices();
    let pool = all;

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
    return getPickerPool()
      .map((voice) => ({
        voice,
        voiceURI: voice.voiceURI,
        label: formatVoiceLabel(voice),
        score: femaleVoiceScore(voice),
        isFemale: isFemaleVoice(voice),
        langMatch: matchesAppLang(voice),
        onPhone: isMobileDevice() || isPhoneUsableVoice(voice),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.langMatch !== b.langMatch) return a.langMatch ? -1 : 1;
        return a.label.localeCompare(b.label, locale);
      });
  }

  function formatVoiceLabel(voice) {
    const gender = isFemaleVoice(voice) ? '♀ ' : isMaleVoice(voice) ? '♂ ' : '◦ ';
    const local = voice.localService ? '' : I18n.t('voiceOnline');
    return `${gender}${voice.name} — ${voice.lang}${local}`;
  }

  function pickDefaultVoice() {
    const ranked = [...getPickerPool()].sort((a, b) => femaleVoiceScore(b) - femaleVoiceScore(a));
    const bestFemale = ranked.find((v) => isFemaleVoice(v) && femaleVoiceScore(v) > 0);
    if (bestFemale) return bestFemale;
    const bestScored = ranked.find((v) => femaleVoiceScore(v) > 0);
    return bestScored || ranked.find((v) => !isMaleVoice(v)) || ranked[0] || null;
  }

  function getFriendlyTone() {
    const female = selectedVoice && (isFemaleVoice(selectedVoice) || !isMaleVoice(selectedVoice));
    return {
      rate: female ? 0.98 : 1.0,
      pitch: female ? 1.1 : 1.12,
    };
  }

  function loadSavedVoice() {
    const savedUri = localStorage.getItem(voiceStorageKey());
    const voices = getAllVoices();

    if (savedUri) {
      const saved = voices.find((v) => v.voiceURI === savedUri);
      if (saved && (!femaleOnlyFilter || !isMaleVoice(saved)) && (!phoneOnlyFilter || isPhoneUsableVoice(saved))) {
        selectedVoice = saved;
        return;
      }
    }

    selectedVoice = pickDefaultVoice();
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

    const refreshVoices = () => {
      loadSavedVoice();
      notifyVoicesReady();
    };

    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = refreshVoices;
    }

    refreshVoices();
    setTimeout(refreshVoices, 250);
    setTimeout(refreshVoices, 1000);
  }

  function setLanguage() {
    updateRecognitionLang();
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
    if (femaleOnlyFilter && isMaleVoice(voice)) return false;
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

    const utterance = new SpeechSynthesisUtterance(text);
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
      isSpeaking = false;
      notifyStatus('idle');
      if (onDone) onDone();
    };

    utterance.onerror = () => {
      isSpeaking = false;
      notifyStatus('idle');
      if (onDone) onDone();
    };

    synth.speak(utterance);
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

  return {
    init,
    setLanguage,
    speak,
    listen,
    stopListening,
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
    previewVoice,
    previewVoiceUri,
    isSupported,
    getSupportMessage,
    get isListening() { return isListening; },
    get isSpeaking() { return isSpeaking; },
    set onResult(fn) { onResult = fn; },
    set onStatusChange(fn) { onStatusChange = fn; },
    set onVoicesReady(fn) { onVoicesReady = fn; },
  };
})();
