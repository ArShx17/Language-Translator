/* ═══════════════════════════════════════════════════════════
   Language Translator — App Logic v4
   Creators: Abhay_Maddy & ArShx17
   ═══════════════════════════════════════════════════════════ */

;(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);

  const inputText      = $('#input-text');
  const outputText     = $('#output-text');
  const srcLang        = $('#src-lang');
  const destLang       = $('#dest-lang');
  const translateBtn   = $('#translate-btn');
  const clearBtn       = $('#clear-btn');
  const clearInputBtn  = $('#clear-input-btn');
  const swapBtn        = $('#swap-btn');
  const copyBtn        = $('#copy-btn');
  const voiceInputBtn  = $('#voice-input-btn');
  const speakInputBtn  = $('#speak-input-btn');
  const speakOutputBtn = $('#speak-output-btn');
  const voiceOverlay   = $('#voice-overlay');
  const voiceStatus    = $('#voice-status');
  const voiceStopBtn   = $('#voice-stop-btn');
  const inputCharCount = $('#input-char-count');
  const outputCharCount= $('#output-char-count');
  const toast          = $('#toast');
  const toastMsg       = $('#toast-msg');
  const toastIcon      = $('#toast-icon');
  const particlesCont  = $('#particles');

  const MAX_CHARS = 5000;
  const API_URL   = 'https://api.mymemory.translated.net/get';
  const AUTO_TRANSLATE_DELAY = 800; // faster — start translating 0.8s after typing stops

  const LOCALE_MAP = {
    'en':'en-US','hi':'hi-IN','fr':'fr-FR','de':'de-DE',
    'es':'es-ES','it':'it-IT','ja':'ja-JP','ko':'ko-KR',
    'zh-CN':'zh-CN','ar':'ar-SA','pt':'pt-BR','ru':'ru-RU',
    'bn':'bn-IN','ta':'ta-IN','te':'te-IN','ur':'ur-PK',
    'tr':'tr-TR','vi':'vi-VN','th':'th-TH','nl':'nl-NL',
    'pl':'pl-PL','sv':'sv-SE','uk':'uk-UA',
  };

  const LANG_NAMES = {
    'en':'English','hi':'Hindi','fr':'French','de':'German',
    'es':'Spanish','it':'Italian','ja':'Japanese','ko':'Korean',
    'zh-CN':'Chinese','ar':'Arabic','pt':'Portuguese','ru':'Russian',
    'bn':'Bengali','ta':'Tamil','te':'Telugu','ur':'Urdu',
    'tr':'Turkish','vi':'Vietnamese','th':'Thai','nl':'Dutch',
    'pl':'Polish','sv':'Swedish','uk':'Ukrainian',
  };

  const SCRIPT_PATTERNS = [
    { regex: /[\u0900-\u097F]/g, lang: 'hi' },
    { regex: /[\u0980-\u09FF]/g, lang: 'bn' },
    { regex: /[\u0B80-\u0BFF]/g, lang: 'ta' },
    { regex: /[\u0C00-\u0C7F]/g, lang: 'te' },
    { regex: /[\u0600-\u06FF\uFB50-\uFDFF]/g, lang: 'ar' },
    { regex: /[\u0400-\u04FF]/g, lang: 'ru' },
    { regex: /[\u3040-\u30FF\u31F0-\u31FF]/g, lang: 'ja' },
    { regex: /[\uAC00-\uD7AF]/g, lang: 'ko' },
    { regex: /[\u4E00-\u9FFF]/g, lang: 'zh-CN' },
    { regex: /[\u0E00-\u0E7F]/g, lang: 'th' },
  ];

  const LATIN_WORDS = {
    'fr':['le','la','les','des','est','une','un','que','dans','pour','avec','sur','pas','sont','nous','vous','ils','mais','tout','cette'],
    'es':['el','la','los','las','es','una','un','que','del','por','con','para','como','pero','sus','hay','fue','todo'],
    'de':['der','die','das','den','ein','eine','ist','und','nicht','von','mit','auf','sich','dem','dass','als','auch'],
    'it':['il','la','le','di','che','un','una','per','non','con','del','sono','dalla','questo','anche','come'],
    'pt':['de','que','uma','para','com','por','mais','como','dos','das','foi','seu','sua','tem','isso'],
    'nl':['de','het','een','van','en','in','is','dat','op','te','zijn','voor','met','niet','aan'],
    'tr':['bir','ve','bu','da','ile','olan','daha','gibi','var','ne','ama','kadar','sonra'],
    'pl':['nie','jest','to','na','jak','ale','tak','za','do','od','czy','po','ich','tylko'],
    'sv':['och','att','det','som','en','med','har','den','av','till','var','inte','kan','om'],
  };

  /* ═══ PARTICLES ═══ */
  function spawnParticles(n = 25) {
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.classList.add('particle');
      p.style.left = `${Math.random() * 100}%`;
      p.style.top  = `${100 + Math.random() * 20}%`;
      const s = 2 + Math.random() * 3;
      p.style.width = p.style.height = `${s}px`;
      p.style.opacity = `${0.12 + Math.random() * 0.2}`;
      p.style.animationDuration = `${14 + Math.random() * 22}s`;
      p.style.animationDelay    = `${Math.random() * 15}s`;
      particlesCont.appendChild(p);
    }
  }

  /* ═══ AUTO-RESIZE ═══ */
  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = `${Math.max(180, el.scrollHeight)}px`;
  }

  /* ═══ CHAR COUNT ═══ */
  function updateInputCount() {
    const l = inputText.value.length;
    inputCharCount.textContent = `${l.toLocaleString()} / ${MAX_CHARS.toLocaleString()}`;
    inputCharCount.style.color = l > MAX_CHARS * 0.9 ? '#f43f5e' : '';
  }
  function updateOutputCount() {
    const l = outputText.value.length;
    outputCharCount.textContent = l > 0 ? `${l.toLocaleString()} chars` : '0';
  }

  /* ═══ TOAST ═══ */
  let toastTimer = null;
  function showToast(msg, type = 'success') {
    clearTimeout(toastTimer);
    toastMsg.textContent = msg;
    toastIcon.textContent = type === 'success' ? '✓' : '✕';
    toast.classList.toggle('error', type === 'error');
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  /* ═══ AUTO-DETECT → sets dropdown ═══ */
  let detectTimer = null;
  let lastDetected = null;

  function detectLanguage(text) {
    if (!text || text.length < 5) { lastDetected = null; return; }

    for (const { regex, lang } of SCRIPT_PATTERNS) {
      if ((text.match(regex) || []).length >= 2) {
        setDetectedLang(lang);
        return;
      }
    }

    if (text.length >= 8) {
      const words = text.toLowerCase().split(/\s+/);
      let best = null, bestN = 0;
      for (const [code, kw] of Object.entries(LATIN_WORDS)) {
        let n = 0;
        for (const w of words) if (kw.includes(w)) n++;
        if (n > bestN) { bestN = n; best = code; }
      }
      if (best && bestN >= 2) { setDetectedLang(best); return; }
      if (/^[a-zA-Z\s.,!?'";\-:()0-9]+$/.test(text.slice(0, 80))) { setDetectedLang('en'); return; }
    }
    lastDetected = null;
  }

  function setDetectedLang(code) {
    if (srcLang.value !== 'auto') return;
    if (lastDetected === code) return;
    lastDetected = code;
    if (srcLang.querySelector(`option[value="${code}"]`)) {
      srcLang.value = code;
    }
  }

  function onInputChanged() {
    clearTimeout(detectTimer);
    detectTimer = setTimeout(() => detectLanguage(inputText.value.trim()), 300);
  }

  /* ═══ AUTO-TRANSLATE on typing ═══ */
  let autoTimer = null;

  function scheduleAutoTranslate() {
    clearTimeout(autoTimer);
    const text = inputText.value.trim();
    if (!text) { outputText.value = ''; updateOutputCount(); return; }
    autoTimer = setTimeout(() => translateText(), AUTO_TRANSLATE_DELAY);
  }

  /* ═══ TRANSLATE ═══ */
  let isTranslating = false;
  let lastTranslatedText = '';

  async function translateText() {
    const text = inputText.value.trim();
    if (!text) { showToast('Enter text first.', 'error'); return; }

    // Skip if same text was already translated
    if (text === lastTranslatedText && outputText.value) return;

    if (isTranslating) return;
    isTranslating = true;

    const src = srcLang.value === 'auto' ? 'autodetect' : srcLang.value;
    const dest = destLang.value;

    if (src === dest && src !== 'autodetect') {
      outputText.value = text;
      updateOutputCount();
      isTranslating = false;
      lastTranslatedText = text;
      return;
    }

    translateBtn.classList.add('loading');
    translateBtn.disabled = true;

    try {
      const chunks = splitText(text, 500);
      const results = [];

      for (const chunk of chunks) {
        const url = `${API_URL}?q=${encodeURIComponent(chunk)}&langpair=${encodeURIComponent(`${src}|${dest}`)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.responseStatus === 200) {
          results.push(data.responseData.translatedText);
        } else {
          throw new Error(data.responseDetails || 'Translation failed.');
        }
      }

      outputText.value = results.join(' ');
      lastTranslatedText = text;
      autoResize(outputText);
      updateOutputCount();
    } catch (err) {
      console.error('Translation error:', err);
      showToast(err.message || 'Translation failed.', 'error');
    } finally {
      translateBtn.classList.remove('loading');
      translateBtn.disabled = false;
      isTranslating = false;
    }
  }

  function splitText(text, max) {
    if (text.length <= max) return [text];
    const chunks = [];
    let rem = text;
    while (rem.length > 0) {
      if (rem.length <= max) { chunks.push(rem); break; }
      let at = -1;
      for (const e of ['. ','! ','? ','। ','。 ']) {
        const i = rem.lastIndexOf(e, max);
        if (i > at) at = i + e.length;
      }
      if (at <= 0) at = rem.lastIndexOf(' ', max);
      if (at <= 0) at = max;
      chunks.push(rem.slice(0, at).trim());
      rem = rem.slice(at).trim();
    }
    return chunks;
  }

  /* ═══ VOICE INPUT ═══ */
  let recognition = null;
  let isListening = false;

  function initSpeechRec() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      voiceInputBtn.title = 'Not supported — use Chrome/Edge';
      voiceInputBtn.style.opacity = '0.4';
      voiceInputBtn.style.cursor = 'not-allowed';
      return null;
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let baseTxt = '';

    function setLang() {
      const lang = srcLang.value;
      rec.lang = lang === 'auto' ? '' : (LOCALE_MAP[lang] || lang);
    }

    rec.onstart = () => {
      isListening = true;
      baseTxt = inputText.value;
      voiceInputBtn.classList.add('listening');
      voiceOverlay.classList.add('active');
      voiceStatus.textContent = 'Listening...';
    };

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          baseTxt += (baseTxt ? ' ' : '') + t;
          inputText.value = baseTxt;
          autoResize(inputText);
          updateInputCount();
          onInputChanged();
          scheduleAutoTranslate();
        } else {
          interim += t;
        }
      }
      inputText.value = baseTxt + (interim ? ' ' + interim : '');
      autoResize(inputText);
      updateInputCount();
      voiceStatus.textContent = interim ? 'Hearing you...' : 'Listening...';
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') showToast('Mic access denied.', 'error');
      else if (e.error !== 'aborted') showToast(`Voice: ${e.error}`, 'error');
      stopListening();
    };

    rec.onend = () => {
      if (isListening) {
        try { setLang(); rec.start(); } catch { stopListening(); }
      }
    };

    rec._setLang = setLang;
    return rec;
  }

  function startListening() {
    if (!recognition) recognition = initSpeechRec();
    if (!recognition) { showToast('Use Chrome or Edge for voice.', 'error'); return; }
    recognition._setLang();
    try { recognition.start(); } catch {
      recognition.stop();
      setTimeout(() => { try { recognition.start(); } catch {} }, 200);
    }
  }

  function stopListening() {
    isListening = false;
    if (recognition) try { recognition.stop(); } catch {}
    voiceInputBtn.classList.remove('listening');
    voiceOverlay.classList.remove('active');
    if (inputText.value.trim()) { onInputChanged(); scheduleAutoTranslate(); }
  }

  /* ═══ TEXT-TO-SPEECH ═══ */
  let voices = [];
  function loadVoices() { voices = speechSynthesis.getVoices(); }

  function speakText(text, langCode) {
    if (!text?.trim()) { showToast('No text to speak.', 'error'); return; }
    if (!('speechSynthesis' in window)) { showToast('TTS not supported.', 'error'); return; }

    speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text.trim());
    const locale = LOCALE_MAP[langCode] || langCode || 'en-US';
    u.lang = locale;
    u.rate = 0.92;
    u.pitch = 1;

    if (voices.length) {
      let v = voices.find(x => x.lang === locale);
      if (!v) v = voices.find(x => x.lang.startsWith(langCode));
      if (!v && locale.includes('-')) v = voices.find(x => x.lang.startsWith(locale.split('-')[0]));
      if (v) u.voice = v;
    }

    u.onstart = () => showToast('🔊 Speaking...');
    u.onerror = (e) => { if (e.error !== 'interrupted' && e.error !== 'canceled') showToast('Speech failed.', 'error'); };
    setTimeout(() => speechSynthesis.speak(u), 50);
  }

  /* ═══ CLEAR ═══ */
  function clearAll() {
    inputText.value = ''; outputText.value = '';
    autoResize(inputText); autoResize(outputText);
    updateInputCount(); updateOutputCount();
    srcLang.value = 'auto'; lastDetected = null; lastTranslatedText = '';
    speechSynthesis.cancel(); inputText.focus();
  }

  function clearInput() {
    inputText.value = ''; autoResize(inputText); updateInputCount();
    srcLang.value = 'auto'; lastDetected = null; lastTranslatedText = '';
    inputText.focus();
  }

  /* ═══ SWAP ═══ */
  function swapLanguages() {
    const s = srcLang.value, d = destLang.value;
    if (s === 'auto') { showToast('Select a source language first.', 'error'); return; }
    srcLang.value = d; destLang.value = s;
    const tmp = inputText.value;
    inputText.value = outputText.value; outputText.value = tmp;
    autoResize(inputText); autoResize(outputText);
    updateInputCount(); updateOutputCount();
    lastDetected = null; lastTranslatedText = '';
    if (inputText.value.trim()) scheduleAutoTranslate();
  }

  /* ═══ COPY ═══ */
  async function copyOutput() {
    const text = outputText.value.trim();
    if (!text) { showToast('Nothing to copy.', 'error'); return; }
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.classList.add('copied');
      const lbl = copyBtn.querySelector('.copy-label');
      if (lbl) lbl.textContent = 'Copied!';
      showToast('Copied!');
      setTimeout(() => { copyBtn.classList.remove('copied'); if (lbl) lbl.textContent = 'Copy'; }, 2000);
    } catch { showToast('Copy failed.', 'error'); }
  }

  /* ═══ KEYBOARD SHORTCUTS ═══
     All standard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+A, Ctrl+C, Ctrl+V,
     Ctrl+X, Shift+Enter) work natively in textarea.
     We only intercept Ctrl+Enter and Ctrl+S for custom behavior.
     ═══════════════════════════════════════════ */
  function onKeydown(e) {
    // Ctrl+Enter → Force translate immediately
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(autoTimer);
      lastTranslatedText = ''; // force re-translate
      translateText();
      return;
    }

    // Ctrl+S → Swap languages
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      swapLanguages();
      return;
    }

    // NOTE: Ctrl+Z (undo), Ctrl+Y (redo), Ctrl+A (select all),
    // Ctrl+C (copy), Ctrl+V (paste), Ctrl+X (cut),
    // Shift+Enter (new line) all work natively in <textarea>.
    // We do NOT intercept them — they just work automatically.
  }

  /* ═══ INIT ═══ */
  function init() {
    spawnParticles(28);

    if ('speechSynthesis' in window) {
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    recognition = initSpeechRec();

    translateBtn.addEventListener('click', translateText);
    clearBtn.addEventListener('click', clearAll);
    clearInputBtn.addEventListener('click', clearInput);
    swapBtn.addEventListener('click', swapLanguages);
    copyBtn.addEventListener('click', copyOutput);
    voiceInputBtn.addEventListener('click', () => isListening ? stopListening() : startListening());
    voiceStopBtn.addEventListener('click', stopListening);

    speakInputBtn.addEventListener('click', () => {
      speakText(inputText.value, srcLang.value === 'auto' ? 'en' : srcLang.value);
    });
    speakOutputBtn.addEventListener('click', () => speakText(outputText.value, destLang.value));

    // Input → auto-detect + auto-translate as you type
    inputText.addEventListener('input', () => {
      updateInputCount();
      autoResize(inputText);
      onInputChanged();
      scheduleAutoTranslate();
    });

    outputText.addEventListener('input', () => { updateOutputCount(); autoResize(outputText); });

    // Language change → re-translate
    srcLang.addEventListener('change', () => {
      lastDetected = null; lastTranslatedText = '';
      if (inputText.value.trim()) scheduleAutoTranslate();
    });
    destLang.addEventListener('change', () => {
      lastTranslatedText = '';
      if (inputText.value.trim()) scheduleAutoTranslate();
    });

    document.addEventListener('keydown', onKeydown);
    updateInputCount(); updateOutputCount();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
