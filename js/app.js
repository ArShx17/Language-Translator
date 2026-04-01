/* ═══════════════════════════════════════════════════════════
   Language Translator — Application Logic v2
   Author : Abhay (ArShx17) — github.com/ArShx17
   Uses   : MyMemory Translation API (free, no key required)
   Features: Voice input, Voice output (TTS), Auto-detect language
   ═══════════════════════════════════════════════════════════ */

;(function () {
  'use strict';

  /* ───────── DOM References ───────── */
  const $ = (sel) => document.querySelector(sel);

  const inputText       = $('#input-text');
  const outputText      = $('#output-text');
  const srcLang         = $('#src-lang');
  const destLang        = $('#dest-lang');
  const translateBtn    = $('#translate-btn');
  const clearBtn        = $('#clear-btn');
  const clearInputBtn   = $('#clear-input-btn');
  const swapBtn         = $('#swap-btn');
  const copyBtn         = $('#copy-btn');
  const voiceInputBtn   = $('#voice-input-btn');
  const speakInputBtn   = $('#speak-input-btn');
  const speakOutputBtn  = $('#speak-output-btn');
  const voiceOverlay    = $('#voice-overlay');
  const voiceStatus     = $('#voice-status');
  const voiceStopBtn    = $('#voice-stop-btn');
  const detectedBadge   = $('#detected-badge');
  const detectedLangName= $('#detected-lang-name');
  const inputCharCount  = $('#input-char-count');
  const outputCharCount = $('#output-char-count');
  const toast           = $('#toast');
  const toastMsg        = $('#toast-msg');
  const toastIcon       = $('#toast-icon');
  const particlesCont   = $('#particles');

  /* ───────── Constants ───────── */
  const MAX_CHARS = 5000;
  const API_URL   = 'https://api.mymemory.translated.net/get';

  /* ───────── Language Detection Map ───────── */
  // Maps language codes to human-readable names
  const LANG_MAP = {
    'auto': 'Auto Detect',
    'en':    'English',
    'hi':    'Hindi',
    'fr':    'French',
    'de':    'German',
    'es':    'Spanish',
    'it':    'Italian',
    'ja':    'Japanese',
    'ko':    'Korean',
    'zh-CN': 'Chinese',
    'ar':    'Arabic',
    'pt':    'Portuguese',
    'ru':    'Russian',
    'bn':    'Bengali',
    'ta':    'Tamil',
    'te':    'Telugu',
    'ur':    'Urdu',
    'tr':    'Turkish',
    'vi':    'Vietnamese',
    'th':    'Thai',
    'nl':    'Dutch',
    'pl':    'Polish',
    'sv':    'Swedish',
    'uk':    'Ukrainian',
  };

  // Unicode ranges for script-based language detection
  const SCRIPT_PATTERNS = [
    { regex: /[\u0900-\u097F]/,          lang: 'hi', name: 'Hindi'      },
    { regex: /[\u0980-\u09FF]/,          lang: 'bn', name: 'Bengali'    },
    { regex: /[\u0B80-\u0BFF]/,          lang: 'ta', name: 'Tamil'      },
    { regex: /[\u0C00-\u0C7F]/,          lang: 'te', name: 'Telugu'     },
    { regex: /[\u0600-\u06FF]/,          lang: 'ar', name: 'Arabic/Urdu'},
    { regex: /[\u0400-\u04FF]/,          lang: 'ru', name: 'Russian'    },
    { regex: /[\u3040-\u309F\u30A0-\u30FF]/, lang: 'ja', name: 'Japanese' },
    { regex: /[\uAC00-\uD7AF]/,         lang: 'ko', name: 'Korean'     },
    { regex: /[\u4E00-\u9FFF]/,          lang: 'zh-CN', name: 'Chinese' },
    { regex: /[\u0E00-\u0E7F]/,          lang: 'th', name: 'Thai'       },
    { regex: /[\u0A80-\u0AFF]/,          lang: 'gu', name: 'Gujarati'   },
  ];

  // Common words for Latin-script languages
  const LATIN_LANG_WORDS = {
    'fr': ['le','la','les','des','est','une','un','que','dans','pour','avec','sur','pas','sont','nous','vous','ils','mais','tout','cette','ces','aux','été','faire','aussi','très','bien'],
    'es': ['el','la','los','las','es','una','un','que','del','por','con','para','como','más','pero','sus','hay','fue','todo','está','desde','son','entre','cuando','muy','hasta'],
    'de': ['der','die','das','den','ein','eine','ist','und','nicht','von','mit','auf','für','sich','dem','dass','als','auch','nach','wird','bei','aus','noch','wie','sind','über'],
    'it': ['il','la','le','di','che','un','una','per','non','con','del','sono','dalla','questo','questa','anche','più','come','nella','nel','degli','delle','hanno','essere','stato','molto'],
    'pt': ['de','que','não','uma','para','com','por','mais','como','dos','das','foi','seu','sua','são','nos','tem','está','isso','também','ele','ela','mas','até','bem','muito'],
    'nl': ['de','het','een','van','en','in','is','dat','op','te','zijn','voor','met','niet','aan','er','als','maar','om','ook','dan','nog','bij','uit','wel','naar'],
    'tr': ['bir','ve','bu','da','ile','için','olan','daha','gibi','var','çok','ne','ama','kadar','sonra','olarak','bunu','hem','hiç','ben','sen','biz','siz','onlar'],
    'pl': ['nie','się','jest','to','że','na','jak','ale','tak','już','za','do','od','czy','po','ich','tylko','gdy','przez','ten','tej','tego','które','był','była'],
    'sv': ['och','att','det','som','en','för','med','har','den','av','till','var','inte','kan','om','ett','på','jag','han','hon','men','från','vi','de','dig'],
  };

  /* ═══════════════════════════════════════════════════════════
     PARTICLES (aesthetic background animation)
     ═══════════════════════════════════════════════════════════ */
  function spawnParticles(count = 25) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.classList.add('particle');
      p.style.left     = `${Math.random() * 100}%`;
      p.style.top      = `${100 + Math.random() * 20}%`;
      p.style.width    = `${2 + Math.random() * 3}px`;
      p.style.height   = p.style.width;
      p.style.opacity  = `${0.12 + Math.random() * 0.2}`;
      p.style.animationDuration = `${14 + Math.random() * 22}s`;
      p.style.animationDelay    = `${Math.random() * 15}s`;
      particlesCont.appendChild(p);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     AUTO-RESIZE TEXTAREAS
     ═══════════════════════════════════════════════════════════ */
  function autoResize(textarea) {
    textarea.style.height = 'auto';
    const computedMin = 190;
    const scrollH     = textarea.scrollHeight;
    textarea.style.height = `${Math.max(computedMin, scrollH)}px`;
  }

  /* ═══════════════════════════════════════════════════════════
     CHARACTER COUNT
     ═══════════════════════════════════════════════════════════ */
  function updateInputCharCount() {
    const len = inputText.value.length;
    inputCharCount.textContent = `${len.toLocaleString()} / ${MAX_CHARS.toLocaleString()}`;
    inputCharCount.style.color = len > MAX_CHARS * 0.9 ? '#f43f5e' : '';
  }

  function updateOutputCharCount() {
    const len = outputText.value.length;
    outputCharCount.textContent = len > 0 ? `${len.toLocaleString()} chars` : '0';
  }

  /* ═══════════════════════════════════════════════════════════
     TOAST NOTIFICATION
     ═══════════════════════════════════════════════════════════ */
  let toastTimer = null;

  function showToast(message, type = 'success') {
    clearTimeout(toastTimer);
    toastMsg.textContent = message;
    toastIcon.textContent = type === 'success' ? '✓' : '✕';
    toast.classList.remove('error');
    if (type === 'error') toast.classList.add('error');
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  /* ═══════════════════════════════════════════════════════════
     AUTO-DETECT LANGUAGE (on typing)
     ═══════════════════════════════════════════════════════════ */
  let detectDebounce = null;

  function detectLanguage(text) {
    if (!text || text.length < 3) {
      detectedBadge.style.display = 'none';
      return;
    }

    // 1. Check non-Latin scripts first
    for (const { regex, lang, name } of SCRIPT_PATTERNS) {
      const matches = (text.match(regex) || []).length;
      if (matches >= 2) {
        showDetectedBadge(lang, name);
        return;
      }
    }

    // 2. For Latin-script text, check common words
    if (text.length >= 10) {
      const words = text.toLowerCase().split(/\s+/);
      const scores = {};

      for (const [langCode, keywords] of Object.entries(LATIN_LANG_WORDS)) {
        scores[langCode] = 0;
        for (const w of words) {
          if (keywords.includes(w)) scores[langCode]++;
        }
      }

      // Find best match
      let bestLang = null;
      let bestScore = 0;
      for (const [lang, score] of Object.entries(scores)) {
        if (score > bestScore) {
          bestScore = score;
          bestLang  = lang;
        }
      }

      // Need at least 2 keyword matches to be confident
      if (bestLang && bestScore >= 2) {
        showDetectedBadge(bestLang, LANG_MAP[bestLang] || bestLang);
        return;
      }

      // Default to English for Latin text
      if (/^[a-zA-Z\s.,!?'";\-:()0-9]+$/.test(text.slice(0, 100))) {
        showDetectedBadge('en', 'English');
        return;
      }
    }

    detectedBadge.style.display = 'none';
  }

  function showDetectedBadge(langCode, langName) {
    // Only show badge when source is "auto"
    if (srcLang.value !== 'auto') {
      detectedBadge.style.display = 'none';
      return;
    }

    detectedLangName.textContent = `${langName} detected`;
    detectedBadge.style.display = 'inline-flex';
  }

  function onInputForDetect() {
    clearTimeout(detectDebounce);
    detectDebounce = setTimeout(() => {
      detectLanguage(inputText.value.trim());
    }, 400);
  }

  /* ═══════════════════════════════════════════════════════════
     TRANSLATE — MyMemory API
     ═══════════════════════════════════════════════════════════ */
  async function translateText() {
    const text = inputText.value.trim();
    if (!text) {
      showToast('Please enter some text to translate.', 'error');
      inputText.focus();
      return;
    }

    const src  = srcLang.value === 'auto' ? 'autodetect' : srcLang.value;
    const dest = destLang.value;
    const langPair = `${src}|${dest}`;

    translateBtn.classList.add('loading');
    translateBtn.disabled = true;

    try {
      const chunks  = splitText(text, 500);
      const results = [];

      for (const chunk of chunks) {
        const url = `${API_URL}?q=${encodeURIComponent(chunk)}&langpair=${encodeURIComponent(langPair)}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error(`API responded with status ${res.status}`);

        const data = await res.json();

        if (data.responseStatus === 200) {
          results.push(data.responseData.translatedText);

          // If API returns detected language info, show it
          if (src === 'autodetect' && data.responseData.detectedLanguage) {
            const detected = data.responseData.detectedLanguage;
            if (LANG_MAP[detected]) {
              showDetectedBadge(detected, LANG_MAP[detected]);
            }
          }
        } else {
          throw new Error(data.responseDetails || 'Translation failed.');
        }
      }

      const translated = results.join(' ');
      outputText.value = translated;
      autoResize(outputText);
      updateOutputCharCount();
      showToast('Translation complete!');
    } catch (err) {
      console.error('Translation error:', err);
      showToast(err.message || 'Translation failed. Please try again.', 'error');
    } finally {
      translateBtn.classList.remove('loading');
      translateBtn.disabled = false;
    }
  }

  /**
   * Split text into chunks, preferring sentence boundaries.
   */
  function splitText(text, maxLen) {
    if (text.length <= maxLen) return [text];

    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLen) {
        chunks.push(remaining);
        break;
      }

      let splitAt = -1;
      const enders = ['. ', '! ', '? ', '। ', '。 '];
      for (const e of enders) {
        const idx = remaining.lastIndexOf(e, maxLen);
        if (idx > splitAt) splitAt = idx + e.length;
      }

      if (splitAt <= 0) splitAt = remaining.lastIndexOf(' ', maxLen);
      if (splitAt <= 0) splitAt = maxLen;

      chunks.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trim();
    }

    return chunks;
  }

  /* ═══════════════════════════════════════════════════════════
     VOICE INPUT — Web Speech Recognition API
     ═══════════════════════════════════════════════════════════ */
  let recognition = null;
  let isListening = false;

  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceInputBtn.title = 'Voice input not supported in this browser';
      voiceInputBtn.style.opacity = '0.4';
      voiceInputBtn.style.cursor = 'not-allowed';
      return null;
    }

    const rec = new SpeechRecognition();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // Set recognition language based on source language
    function updateRecLang() {
      const lang = srcLang.value;
      if (lang === 'auto') {
        rec.lang = ''; // Browser's default
      } else {
        // Map our lang codes to BCP-47 locale tags
        const localeMap = {
          'en': 'en-US', 'hi': 'hi-IN', 'fr': 'fr-FR', 'de': 'de-DE',
          'es': 'es-ES', 'it': 'it-IT', 'ja': 'ja-JP', 'ko': 'ko-KR',
          'zh-CN': 'zh-CN', 'ar': 'ar-SA', 'pt': 'pt-BR', 'ru': 'ru-RU',
          'bn': 'bn-IN', 'ta': 'ta-IN', 'te': 'te-IN', 'ur': 'ur-PK',
          'tr': 'tr-TR', 'vi': 'vi-VN', 'th': 'th-TH', 'nl': 'nl-NL',
          'pl': 'pl-PL', 'sv': 'sv-SE', 'uk': 'uk-UA'
        };
        rec.lang = localeMap[lang] || lang;
      }
    }

    let finalTranscript = '';

    rec.onstart = () => {
      isListening = true;
      finalTranscript = inputText.value;
      voiceInputBtn.classList.add('listening');
      voiceOverlay.classList.add('active');
      voiceStatus.textContent = 'Listening...';
    };

    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? ' ' : '') + transcript;
        } else {
          interim += transcript;
        }
      }

      // Show real-time transcription in the textarea
      inputText.value = finalTranscript + (interim ? ' ' + interim : '');
      autoResize(inputText);
      updateInputCharCount();
      onInputForDetect();

      voiceStatus.textContent = interim ? 'Hearing you...' : 'Listening...';
    };

    rec.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        showToast('Microphone access denied. Please allow mic access.', 'error');
      } else if (event.error !== 'aborted') {
        showToast(`Voice error: ${event.error}`, 'error');
      }
      stopListening();
    };

    rec.onend = () => {
      if (isListening) {
        // Auto-restart if still in listening mode
        try {
          updateRecLang();
          rec.start();
        } catch {
          stopListening();
        }
      }
    };

    // Store the lang updater for use when starting
    rec._updateLang = updateRecLang;

    return rec;
  }

  function startListening() {
    if (!recognition) {
      recognition = initSpeechRecognition();
    }
    if (!recognition) {
      showToast('Voice input not supported. Try Chrome or Edge.', 'error');
      return;
    }

    recognition._updateLang();

    try {
      recognition.start();
    } catch (e) {
      // Already started, stop and restart
      recognition.stop();
      setTimeout(() => {
        try { recognition.start(); } catch {}
      }, 200);
    }
  }

  function stopListening() {
    isListening = false;
    if (recognition) {
      try { recognition.stop(); } catch {}
    }
    voiceInputBtn.classList.remove('listening');
    voiceOverlay.classList.remove('active');
  }

  function toggleVoiceInput() {
    if (isListening) {
      stopListening();
      showToast('Voice input stopped.');
    } else {
      startListening();
    }
  }

  /* ═══════════════════════════════════════════════════════════
     TEXT-TO-SPEECH — Web Speech Synthesis API
     ═══════════════════════════════════════════════════════════ */
  function speakText(text, langCode) {
    if (!text || !text.trim()) {
      showToast('No text to speak.', 'error');
      return;
    }

    if (!('speechSynthesis' in window)) {
      showToast('Text-to-speech not supported in this browser.', 'error');
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Map our codes to BCP-47
    const ttsLocale = {
      'auto': '',  'en': 'en-US',  'hi': 'hi-IN',  'fr': 'fr-FR',
      'de': 'de-DE', 'es': 'es-ES', 'it': 'it-IT', 'ja': 'ja-JP',
      'ko': 'ko-KR', 'zh-CN': 'zh-CN', 'ar': 'ar-SA', 'pt': 'pt-BR',
      'ru': 'ru-RU', 'bn': 'bn-IN', 'ta': 'ta-IN', 'te': 'te-IN',
      'ur': 'ur-PK', 'tr': 'tr-TR', 'vi': 'vi-VN', 'th': 'th-TH',
      'nl': 'nl-NL', 'pl': 'pl-PL', 'sv': 'sv-SE', 'uk': 'uk-UA'
    };

    utterance.lang = ttsLocale[langCode] || langCode || '';
    utterance.rate  = 0.95;
    utterance.pitch = 1;

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const match  = voices.find(v => v.lang.startsWith(langCode));
    if (match) utterance.voice = match;

    utterance.onstart = () => showToast('🔊 Speaking...');
    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        showToast('Speech failed.', 'error');
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  /* ═══════════════════════════════════════════════════════════
     CLEAR
     ═══════════════════════════════════════════════════════════ */
  function clearAll() {
    inputText.value  = '';
    outputText.value = '';
    autoResize(inputText);
    autoResize(outputText);
    updateInputCharCount();
    updateOutputCharCount();
    detectedBadge.style.display = 'none';
    window.speechSynthesis.cancel();
    inputText.focus();
  }

  function clearInput() {
    inputText.value = '';
    autoResize(inputText);
    updateInputCharCount();
    detectedBadge.style.display = 'none';
    inputText.focus();
  }

  /* ═══════════════════════════════════════════════════════════
     SWAP
     ═══════════════════════════════════════════════════════════ */
  function swapLanguages() {
    const src  = srcLang.value;
    const dest = destLang.value;

    if (src === 'auto') {
      showToast('Cannot swap when source is Auto Detect.', 'error');
      return;
    }

    srcLang.value  = dest;
    destLang.value = src;

    const tmp = inputText.value;
    inputText.value  = outputText.value;
    outputText.value = tmp;

    autoResize(inputText);
    autoResize(outputText);
    updateInputCharCount();
    updateOutputCharCount();
    detectedBadge.style.display = 'none';
  }

  /* ═══════════════════════════════════════════════════════════
     COPY TO CLIPBOARD
     ═══════════════════════════════════════════════════════════ */
  async function copyOutput() {
    const text = outputText.value.trim();
    if (!text) {
      showToast('Nothing to copy.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      copyBtn.classList.add('copied');
      const label = copyBtn.querySelector('.copy-label');
      if (label) label.textContent = 'Copied!';
      showToast('Copied to clipboard!');

      setTimeout(() => {
        copyBtn.classList.remove('copied');
        if (label) label.textContent = 'Copy';
      }, 2000);
    } catch {
      showToast('Failed to copy.', 'error');
    }
  }

  /* ═══════════════════════════════════════════════════════════
     KEYBOARD SHORTCUTS
     ═══════════════════════════════════════════════════════════ */
  function handleKeyboard(e) {
    // Ctrl+Enter → Translate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      translateText();
    }
    // Ctrl+S → Swap (prevent save dialog)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      swapLanguages();
    }
  }

  /* ═══════════════════════════════════════════════════════════
     BIND EVENTS & INIT
     ═══════════════════════════════════════════════════════════ */
  function init() {
    // Particles
    spawnParticles(28);

    // Pre-load voices for TTS
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    }

    // Initialize speech recognition (lazy)
    recognition = initSpeechRecognition();

    // ── Button events ──
    translateBtn.addEventListener('click', translateText);
    clearBtn.addEventListener('click', clearAll);
    clearInputBtn.addEventListener('click', clearInput);
    swapBtn.addEventListener('click', swapLanguages);
    copyBtn.addEventListener('click', copyOutput);

    // Voice input
    voiceInputBtn.addEventListener('click', toggleVoiceInput);
    voiceStopBtn.addEventListener('click', stopListening);

    // Text-to-speech
    speakInputBtn.addEventListener('click', () => {
      const lang = srcLang.value === 'auto' ? 'en' : srcLang.value;
      speakText(inputText.value, lang);
    });

    speakOutputBtn.addEventListener('click', () => {
      speakText(outputText.value, destLang.value);
    });

    // ── Input events ──
    inputText.addEventListener('input', () => {
      updateInputCharCount();
      autoResize(inputText);
      onInputForDetect();
    });

    outputText.addEventListener('input', () => {
      updateOutputCharCount();
      autoResize(outputText);
    });

    // Hide detected badge when source language is changed manually
    srcLang.addEventListener('change', () => {
      if (srcLang.value !== 'auto') {
        detectedBadge.style.display = 'none';
      } else {
        // Re-detect on switch back to auto
        detectLanguage(inputText.value.trim());
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Initial state
    updateInputCharCount();
    updateOutputCharCount();
  }

  /* ───────── Start ───────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
