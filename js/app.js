/**
 * Mirror — Espejo inteligente con voz
 */
(() => {
  const STATE = {
    AWAITING_NAME: 'awaiting_name',
    READY: 'ready',
  };

  let userName = '';
  let appState = STATE.AWAITING_NAME;
  let listenEnabled = true;
  let lastAnalysis = null;
  let deferredInstall = null;
  let lastStatus = 'idle';

  const $ = (sel) => document.querySelector(sel);

  const screenWelcome = $('#screen-welcome');
  const screenMirror = $('#screen-mirror');
  const camera = $('#camera');
  const snapshot = $('#snapshot');
  const statusDot = $('#status-dot');
  const statusText = $('#status-text');
  const assistantText = $('#assistant-text');
  const userText = $('#user-text');
  const userGreeting = $('#user-greeting');
  const avatarRing = $('#avatar-ring');
  const appTitle = $('#app-title');
  const btnStart = $('#btn-start');
  const btnStartLabel = $('#btn-start-label');
  const wakeHint = $('#wake-hint');
  const btnMute = $('#btn-mute');
  const btnListen = $('#btn-listen');
  const btnCapture = $('#btn-capture');
  const btnInstall = $('#btn-install');
  const btnInstallWelcome = $('#btn-install-welcome');
  const installSection = $('#install-section');
  const installHint = $('#install-hint');
  const btnQuestions = $('#btn-questions');
  const questionsMenu = $('#questions-menu');
  const questionsList = $('#questions-list');
  const voiceListWelcome = $('#voice-list-welcome');
  const voiceListMirror = $('#voice-list-mirror');
  const voiceFemaleOnly = $('#voice-female-only');
  const voiceFemaleOnlyMirror = $('#voice-female-only-mirror');
  const voicePhoneOnly = $('#voice-phone-only');
  const voicePhoneOnlyMirror = $('#voice-phone-only-mirror');
  const voiceMobileInfo = $('#voice-mobile-info');
  const voiceMobileInfoMirror = $('#voice-mobile-info-mirror');
  const voiceMobileGuide = $('#voice-mobile-guide');
  const voiceMobileGuideMirror = $('#voice-mobile-guide-mirror');
  const voiceDesktopNote = $('#voice-desktop-note');
  const mirrorBrand = $('.mirror-brand');
  const langSelect = $('#lang-select');
  const voiceCountWelcome = $('#voice-count');
  const voiceCountMirror = $('#voice-count-mirror');
  const btnVoiceSettings = $('#btn-voice-settings');
  const voiceSettingsPanel = $('#voice-settings-panel');

  function init() {
    I18n.setLang('nl');
    I18n.onChange = onLanguageChange;
    langSelect.value = I18n.getLang();
    langSelect.addEventListener('change', () => I18n.setLang(langSelect.value));
    applyTranslations();

    if (!MarbleVoice.isSupported()) {
      btnStart.disabled = true;
      btnStartLabel.textContent = MarbleVoice.getSupportMessage();
      return;
    }

    MarbleVoice.init();
    MarbleVoice.onStatusChange = updateStatus;
    MarbleVoice.onResult = handleSpeechResult;
    MarbleVoice.onVoicesReady = populateVoiceLists;

    voiceFemaleOnly.checked = MarbleVoice.getFemaleOnlyFilter();
    voiceFemaleOnlyMirror.checked = MarbleVoice.getFemaleOnlyFilter();
    voicePhoneOnly.checked = MarbleVoice.getPhoneOnlyFilter();
    voicePhoneOnlyMirror.checked = MarbleVoice.getPhoneOnlyFilter();
    voiceFemaleOnly.addEventListener('change', () => onFemaleFilterChange(voiceFemaleOnly));
    voiceFemaleOnlyMirror.addEventListener('change', () => onFemaleFilterChange(voiceFemaleOnlyMirror));
    voicePhoneOnly.addEventListener('change', () => onPhoneFilterChange(voicePhoneOnly));
    voicePhoneOnlyMirror.addEventListener('change', () => onPhoneFilterChange(voicePhoneOnlyMirror));
    updateVoiceMobileUI();

    btnStart.addEventListener('click', startApp);
    btnVoiceSettings.addEventListener('click', toggleVoiceSettings);
    btnMute.addEventListener('click', toggleMute);
    btnListen.addEventListener('click', toggleListen);
    btnCapture.addEventListener('click', captureAndAnalyze);
    btnInstall.addEventListener('click', installPWA);
    btnInstallWelcome.addEventListener('click', installPWA);
    btnQuestions.addEventListener('click', toggleQuestionsMenu);
    buildQuestionsMenu();
    setupInstallUI();
    updateMobileClass();
    startWakeMode();
    window.addEventListener('resize', updateMobileClass, { passive: true });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstall = e;
      showInstallControls();
      showInstallHint();
    });

    window.addEventListener('appinstalled', () => {
      deferredInstall = null;
      hideInstallControls();
    });

    registerServiceWorker();
  }

  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  function isMobileDevice() {
    return isIOS() || isAndroid();
  }

  function isMobileViewport() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function shouldOfferInstall() {
    return !isStandalone() && (isMobileDevice() || isMobileViewport());
  }

  function updateMobileClass() {
    document.body.classList.toggle('is-mobile', shouldOfferInstall());
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  }

  function showInstallControls() {
    if (!shouldOfferInstall()) return;
    installSection?.classList.remove('hidden');
    btnInstall?.classList.remove('hidden');
    btnInstallWelcome?.classList.remove('hidden');
  }

  function hideInstallControls() {
    installSection?.classList.add('hidden');
    btnInstall?.classList.add('hidden');
    if (installHint) installHint.classList.add('hidden');
  }

  function showInstallHint(force = false) {
    if (!installHint || !shouldOfferInstall()) return;
    if (isIOS()) {
      installHint.textContent = I18n.t('installIosHint');
    } else if (isAndroid()) {
      installHint.textContent = deferredInstall
        ? I18n.t('installAndroidReady')
        : I18n.t('installAndroidHint');
    } else if (isMobileViewport()) {
      installHint.textContent = I18n.t('installMobileHint');
    } else {
      return;
    }
    installHint.classList.remove('hidden');
    if (force) {
      installSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function setupInstallUI() {
    updateMobileClass();

    if (isStandalone()) {
      hideInstallControls();
      return;
    }

    if (!shouldOfferInstall()) {
      installSection?.classList.add('hidden');
      btnInstall?.classList.add('hidden');
      installHint?.classList.add('hidden');
      return;
    }

    showInstallControls();
    showInstallHint(true);
  }

  function onLanguageChange() {
    MarbleBrain.clearRecent();
    applyTranslations();
    MarbleVoice.setLanguage();
    buildQuestionsMenu();
    updateStatus(lastStatus);
    if (userName) userGreeting.textContent = I18n.t('greetingUser', { name: userName });
    if (shouldOfferInstall() && installHint && !installSection?.classList.contains('hidden')) {
      showInstallHint();
    }
    updateMobileClass();
    if (screenWelcome.classList.contains('active')) startWakeMode();
  }

  function updateWakeHint() {
    if (!wakeHint) return;
    const phrase = typeof WakeWord !== 'undefined' ? WakeWord.getPhrases() : 'Hoi Mirror';
    wakeHint.textContent = I18n.t('wakeHint', { phrase });
  }

  function startWakeMode() {
    if (!screenWelcome.classList.contains('active') || !MarbleVoice.isSupported()) return;
    updateWakeHint();
    MarbleVoice.startWakeListening(onWakeTriggered);
  }

  function onWakeTriggered() {
    if (!screenWelcome.classList.contains('active')) return;
    MarbleVoice.speak(I18n.t('wakeGreeting'), () => startApp());
  }

  function applyTranslations() {
    document.documentElement.lang = I18n.t('htmlLang');
    document.title = I18n.t('pageTitle');
    document.querySelector('meta[name="description"]').content = I18n.t('metaDescription');

    appTitle.textContent = I18n.getAppName();
    if (mirrorBrand) mirrorBrand.textContent = I18n.getAppName();

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      el.textContent = I18n.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('aria-label', I18n.t(el.dataset.i18nPlaceholder));
    });

    btnStartLabel.textContent = I18n.t('btnStart');
    voiceFemaleOnly.checked = MarbleVoice.getFemaleOnlyFilter();
    voiceFemaleOnlyMirror.checked = MarbleVoice.getFemaleOnlyFilter();
    voicePhoneOnly.checked = MarbleVoice.getPhoneOnlyFilter();
    voicePhoneOnlyMirror.checked = MarbleVoice.getPhoneOnlyFilter();
    updateVoiceMobileUI();
    btnQuestions.title = I18n.t('questionsBtn');
    btnQuestions.setAttribute('aria-label', I18n.t('questionsBtn'));
    btnVoiceSettings.title = I18n.t('voiceSettingsBtn');
    btnVoiceSettings.setAttribute('aria-label', I18n.t('voiceSettingsBtn'));
    btnInstall.title = I18n.t('installBtn');
    btnInstall.setAttribute('aria-label', I18n.t('installBtn'));
    btnListen.title = I18n.t('listenBtn');
    btnListen.setAttribute('aria-label', I18n.t('listenBtn'));
    btnCapture.title = I18n.t('captureBtn');
    btnCapture.setAttribute('aria-label', I18n.t('captureBtn'));

    const muted = btnMute.classList.contains('muted');
    btnMute.title = muted ? I18n.t('unmuteBtn') : I18n.t('muteBtn');
    btnMute.setAttribute('aria-label', btnMute.title);

    statusText.textContent = I18n.t('statusInit');
    updateWakeHint();
  }

  async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('./sw.js');
      } catch { /* optional */ }
    }
  }

  async function startApp() {
    MarbleVoice.stopWakeListening();
    btnStart.disabled = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      camera.srcObject = stream;
      await camera.play();
    } catch {
      alert(I18n.t('cameraError'));
      btnStart.disabled = false;
      return;
    }

    screenWelcome.classList.remove('active');
    screenMirror.classList.add('active');

    setTimeout(() => {
      const greeting = MarbleBrain.getGreeting();
      showAssistantText(greeting);
      MarbleVoice.speak(greeting, () => scheduleListen(400));
    }, 800);
  }

  function scheduleListen(delay = 300) {
    if (!listenEnabled || appState === null) return;
    setTimeout(() => {
      if (!MarbleVoice.isSpeaking) MarbleVoice.listen();
    }, delay);
  }

  function handleSpeechResult({ interim, final, error }) {
    if (interim) userText.textContent = interim;
    if (error) {
      if (error !== 'no-speech') scheduleListen(500);
      return;
    }
    if (!final) return;

    const text = final.trim();
    userText.textContent = text;
    processUserInput(text);
  }

  function populateVoiceLists() {
    const options = MarbleVoice.getVoicesForPicker();
    const selectedUri = MarbleVoice.getSelectedVoice()?.voiceURI;
    const countText = options.length > 0
      ? I18n.t('voiceCount', { count: options.length })
      : '';

    [voiceCountWelcome, voiceCountMirror].forEach((el) => {
      if (el) el.textContent = countText;
    });

    [voiceListWelcome, voiceListMirror].forEach((list) => {
      if (!list) return;
      list.innerHTML = '';

      if (options.length === 0) {
        const li = document.createElement('li');
        li.className = 'voice-empty';
        li.textContent = MarbleVoice.hasVoiceCatalog()
          ? (I18n.t('voiceNoVoices') || I18n.t('voiceLoading'))
          : I18n.t('voiceLoading');
        list.appendChild(li);
        return;
      }

      options.forEach(({ voiceURI, label, langMatch, onPhone, isNatural }) => {
        const li = document.createElement('li');
        li.className = 'voice-list-item';

        const pickBtn = document.createElement('button');
        pickBtn.type = 'button';
        pickBtn.className = 'voice-option' + (voiceURI === selectedUri ? ' active' : '');
        if (isNatural) pickBtn.classList.add('voice-option--natural');
        pickBtn.setAttribute('role', 'option');
        pickBtn.setAttribute('aria-selected', voiceURI === selectedUri ? 'true' : 'false');

        const langBadge = langMatch ? I18n.t('voiceLangMatch') : I18n.t('voiceOtherLang');
        const phoneBadge = onPhone ? ` · 📱 ${I18n.t('voiceOnDevice')}` : '';
        const naturalBadge = isNatural ? ` · ✨ ${I18n.t('voiceQualityNatural')}` : '';
        pickBtn.innerHTML = `
          <span class="voice-option-main">
            <span class="voice-option-name">${label}</span>
            <span class="voice-option-badge">${langBadge}${naturalBadge}${phoneBadge}</span>
          </span>
        `;

        pickBtn.addEventListener('click', () => {
          MarbleVoice.setVoice(voiceURI);
          populateVoiceLists();
        });

        const previewBtn = document.createElement('button');
        previewBtn.type = 'button';
        previewBtn.className = 'voice-preview-btn';
        previewBtn.title = I18n.t('btnPreview');
        previewBtn.setAttribute('aria-label', I18n.t('btnPreview'));
        previewBtn.textContent = '▶';
        previewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          MarbleVoice.previewVoiceUri(voiceURI);
        });

        li.appendChild(pickBtn);
        li.appendChild(previewBtn);
        list.appendChild(li);
      });
    });
  }

  function onFemaleFilterChange(source) {
    const checked = source.checked;
    voiceFemaleOnly.checked = checked;
    voiceFemaleOnlyMirror.checked = checked;
    MarbleVoice.setFemaleOnlyFilter(checked);
  }

  function onPhoneFilterChange(source) {
    const checked = source.checked;
    voicePhoneOnly.checked = checked;
    voicePhoneOnlyMirror.checked = checked;
    MarbleVoice.setPhoneOnlyFilter(checked);
  }

  function updateVoiceMobileUI() {
    const info = MarbleVoice.getMobileInfo();
    const guideText = I18n.t(info.guideKey);

    [voiceMobileGuide, voiceMobileGuideMirror].forEach((el) => {
      if (el) el.textContent = guideText;
    });

    if (info.isMobile) {
      voiceMobileInfo?.classList.remove('hidden');
      voiceMobileInfoMirror?.classList.remove('hidden');
      voiceDesktopNote?.classList.add('hidden');
    } else {
      voiceMobileInfo?.classList.add('hidden');
      voiceMobileInfoMirror?.classList.add('hidden');
      voiceDesktopNote?.classList.remove('hidden');
    }
  }

  function toggleVoiceSettings() {
    closeQuestionsMenu();
    const isOpen = voiceSettingsPanel.classList.toggle('hidden');
    btnVoiceSettings.classList.toggle('active', !isOpen);
  }

  function closeVoiceSettings() {
    voiceSettingsPanel.classList.add('hidden');
    btnVoiceSettings.classList.remove('active');
  }

  function buildQuestionsMenu() {
    questionsList.innerHTML = '';
    MarbleBrain.getQuestionCategories().forEach((category) => {
      const section = document.createElement('li');
      section.className = 'question-category';

      const head = document.createElement('div');
      head.className = 'question-category-head';
      head.innerHTML = `<span class="q-cat-icon">${category.icon}</span><span class="q-cat-title">${category.title}</span>`;
      section.appendChild(head);

      const grid = document.createElement('ul');
      grid.className = 'question-grid';

      category.items.forEach((item) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'question-item';
        btn.innerHTML = `<span class="q-icon">${item.icon}</span><span class="q-text">${item.text}</span>`;
        btn.addEventListener('click', () => askSuggestedQuestion(item));
        li.appendChild(btn);
        grid.appendChild(li);
      });

      section.appendChild(grid);
      questionsList.appendChild(section);
    });
  }

  function toggleQuestionsMenu() {
    closeVoiceSettings();
    const isOpen = questionsMenu.classList.toggle('hidden');
    const open = !isOpen;
    btnQuestions.classList.toggle('active', open);
    btnQuestions.setAttribute('aria-expanded', String(open));
  }

  function closeQuestionsMenu() {
    questionsMenu.classList.add('hidden');
    btnQuestions.classList.remove('active');
    btnQuestions.setAttribute('aria-expanded', 'false');
  }

  function askSuggestedQuestion(item) {
    closeQuestionsMenu();

    if (appState === STATE.AWAITING_NAME) {
      const wait = I18n.t('waitForName');
      showAssistantText(wait);
      MarbleVoice.speak(wait, () => scheduleListen());
      return;
    }

    if (MarbleVoice.isSpeaking) MarbleVoice.stopSpeaking();
    MarbleVoice.stopListening();

    userText.textContent = item.text;

    if (item.action === 'analyze' || item.intent === 'analyze') {
      captureAndAnalyze();
      return;
    }

    const intent = item.intent || MarbleBrain.detectIntent(item.text);
    const name = userName || I18n.t('fallbackName');

    if (intent === 'analyze') {
      captureAndAnalyze();
      return;
    }

    if (['look', 'outfit', 'hair', 'makeup', 'colors', 'date', 'style_vibe'].includes(intent) && !lastAnalysis) {
      captureAndAnalyze(true);
    }

    const response = MarbleBrain.respond(intent, name, lastAnalysis);
    showAssistantText(response);
    MarbleVoice.speak(response, () => scheduleListen());
  }

  function processUserInput(text) {
    if (appState === STATE.AWAITING_NAME) {
      const name = MarbleBrain.extractName(text);
      if (!name) {
        const retry = I18n.t('nameRetry');
        showAssistantText(retry);
        MarbleVoice.speak(retry, () => scheduleListen());
        return;
      }
      userName = name;
      MarbleVoice.setUserName(userName);
      appState = STATE.READY;
      userGreeting.textContent = I18n.t('greetingUser', { name: userName });
      const confirm = MarbleBrain.getNameConfirm(userName);
      showAssistantText(confirm);
      MarbleVoice.speak(confirm, () => {
        captureAndAnalyze(true);
        scheduleListen(2000);
      });
      return;
    }

    const intent = MarbleBrain.detectIntent(text);

    if (appState === STATE.READY && ['look', 'outfit', 'hair', 'makeup', 'colors', 'date', 'style_vibe'].includes(intent)) {
      if (camera.videoWidth) {
        lastAnalysis = ImageAnalysis.analyzeFrame(camera, snapshot);
      }
    }

    if (intent === 'analyze') {
      captureAndAnalyze();
      return;
    }

    const response = MarbleBrain.respond(intent, userName, lastAnalysis);
    showAssistantText(response);
    MarbleVoice.speak(response, () => scheduleListen());
  }

  function captureAndAnalyze(silent = false) {
    if (!camera.videoWidth) return;

    lastAnalysis = ImageAnalysis.analyzeFrame(camera, snapshot);
    if (silent) return;

    const response = MarbleBrain.analyzeLook(userName || I18n.t('fallbackName'), lastAnalysis);
    showAssistantText(response);
    MarbleVoice.speak(response, () => scheduleListen());
  }

  function showAssistantText(text) {
    assistantText.textContent = text;
  }

  function updateStatus(status) {
    lastStatus = status;
    statusDot.className = 'status-dot ' + status;
    const labels = {
      listening: I18n.t('statusListening'),
      speaking: I18n.t('statusSpeaking'),
      idle: listenEnabled ? I18n.t('statusIdle') : I18n.t('statusMicPaused'),
      error: I18n.t('statusError'),
      wake: I18n.t('statusWakeListening', { phrase: typeof WakeWord !== 'undefined' ? WakeWord.getPhrases() : 'Hoi Mirror' }),
    };
    statusText.textContent = labels[status] || I18n.t('statusIdle');
    avatarRing.classList.toggle('speaking', status === 'speaking');
  }

  function toggleMute() {
    const nowMuted = btnMute.classList.toggle('muted');
    MarbleVoice.setMuted(nowMuted);
    btnMute.textContent = nowMuted ? '🔇' : '🔊';
    btnMute.title = nowMuted ? I18n.t('unmuteBtn') : I18n.t('muteBtn');
    btnMute.setAttribute('aria-label', btnMute.title);
  }

  function toggleListen() {
    listenEnabled = !listenEnabled;
    btnListen.classList.toggle('active', listenEnabled);
    if (!listenEnabled) {
      MarbleVoice.stopListening();
      updateStatus('idle');
    } else {
      scheduleListen(200);
    }
  }

  async function installPWA() {
    if (deferredInstall) {
      deferredInstall.prompt();
      const { outcome } = await deferredInstall.userChoice;
      if (outcome === 'accepted') {
        deferredInstall = null;
        hideInstallControls();
      }
      return;
    }
    showInstallHint(true);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
