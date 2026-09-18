'use strict';

(function () {
  var app     = document.getElementById('app');
  var log     = document.getElementById('log');
  var input   = document.getElementById('input');
  var sendBtn = document.getElementById('sendBtn');
  var clock   = document.getElementById('clock');
  var caption = document.getElementById('caption');
  var sheet   = document.getElementById('sheet');

  var settings = null;
  var history  = [];
  var busy     = false;

  var MAX_TURNS = 20;   // keep context (and cost) bounded

  /* Outside Electron there is no preload bridge — stub it so the UI still
     renders and explains itself instead of throwing on the first call. */
  var bridge = window.jarvis || {
    send:         function () { return Promise.resolve({ ok: false, error: 'Not running inside Electron — start with "npm start".' }); },
    getSettings:  function () { return Promise.resolve({ provider: 'anthropic', apiKeys: {}, models: {}, shortcut: '', systemPrompt: '' }); },
    saveSettings: function (s) { return Promise.resolve(s); },
    minimize: function () {}, toggleMax: function () {}, close: function () {},
    toggleFullscreen: function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    },
    exitFullscreen: function () { if (document.fullscreenElement) document.exitFullscreen(); },
    isFullscreen:   function () { return Promise.resolve(!!document.fullscreenElement); },
    onFullscreen:   function () {},
    onMaximized:    function () {}
  };

  /* ---------- window controls ---------- */
  document.getElementById('tbMin').addEventListener('click', function () { bridge.minimize(); });
  document.getElementById('tbMax').addEventListener('click', function () { bridge.toggleMax(); });
  document.getElementById('tbClose').addEventListener('click', function () { bridge.close(); });
  document.getElementById('tbFull').addEventListener('click', function () { bridge.toggleFullscreen(); });
  document.getElementById('fsExit').addEventListener('click', function () { bridge.exitFullscreen(); });

  document.querySelector('.titlebar').addEventListener('dblclick', function (e) {
    if (e.target.closest('.tb-actions')) return;
    bridge.toggleMax();
  });

  function setFullscreen(on) {
    document.body.classList.toggle('fullscreen', !!on);
    var btn = document.getElementById('tbFull');
    if (btn) btn.title = on ? 'Exit fullscreen (F11)' : 'Fullscreen (F11)';
  }
  bridge.onFullscreen(setFullscreen);
  document.addEventListener('fullscreenchange', function () {
    if (!window.jarvis) setFullscreen(!!document.fullscreenElement);
  });
  bridge.isFullscreen().then(setFullscreen);

  /* ---------- clock ---------- */
  function tickClock() {
    clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ---------- transcript ---------- */
  function addEntry(who, text) {
    var div = document.createElement('div');
    div.className = 'entry ' + who;

    var whoEl = document.createElement('div');
    whoEl.className = 'who mono';
    whoEl.textContent = who === 'ev' ? 'E.V.' : (who === 'you' ? 'you' : 'system');

    var bodyEl = document.createElement('div');
    bodyEl.className = 'body';
    bodyEl.textContent = text;          // textContent, so a message can never inject markup

    div.appendChild(whoEl);
    div.appendChild(bodyEl);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function addTyping() {
    var div = document.createElement('div');
    div.className = 'entry ev';

    var whoEl = document.createElement('div');
    whoEl.className = 'who mono';
    whoEl.textContent = 'E.V.';

    var bodyEl = document.createElement('div');
    bodyEl.className = 'body';
    var dots = document.createElement('span');
    dots.className = 'typing';
    dots.appendChild(document.createElement('span'));
    dots.appendChild(document.createElement('span'));
    dots.appendChild(document.createElement('span'));
    bodyEl.appendChild(dots);

    div.appendChild(whoEl);
    div.appendChild(bodyEl);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  /* ---------- scan panel states ---------- */
  var CAPTIONS = {
    idle:     'grid scan · 4 blocks · quiet',
    thinking: 'grid scan · tracking · stand by',
    offline:  'grid scan · offline · no link'
  };
  function setScan(state) {
    app.className = state === 'idle' ? '' : state;
    caption.textContent = CAPTIONS[state] || CAPTIONS.idle;
  }

  /* ---------- send ---------- */
  function trimmed() { return history.slice(-MAX_TURNS); }

  function sendMessage() {
    var text = input.value.trim();
    if (!text || busy) return;

    busy = true;
    sendBtn.disabled = true;
    addEntry('you', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    input.style.height = 'auto';

    var typingEl = addTyping();
    setScan('thinking');

    bridge.send(trimmed()).then(function (res) {
      if (res.ok) {
        history.push({ role: 'assistant', content: res.text });
        typingEl.querySelector('.body').textContent = res.text;
        setScan('idle');
      } else {
        history.pop();
        typingEl.remove();
        addEntry('system', res.error);
        setScan('offline');
        setTimeout(function () { setScan('idle'); }, 3000);
      }
    }).catch(function (err) {
      history.pop();
      typingEl.querySelector('.body').textContent = "Static on the line — I didn't catch that. Try again?";
      console.error(err);
      setScan('idle');
    }).then(function () {
      busy = false;
      sendBtn.disabled = false;
      log.scrollTop = log.scrollHeight;
      input.focus();
    });
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  input.addEventListener('input', function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  });

  /* ---------- settings ---------- */
  var providerSel = document.getElementById('provider');
  var apiKeyIn    = document.getElementById('apiKey');
  var modelIn     = document.getElementById('model');
  var shortcutIn  = document.getElementById('shortcut');
  var sysIn       = document.getElementById('sysPrompt');

  function fillSheet() {
    providerSel.value = settings.provider;
    apiKeyIn.value    = settings.apiKeys[settings.provider] || '';
    modelIn.value     = settings.models[settings.provider] || '';
    shortcutIn.value  = settings.shortcut || '';
    sysIn.value       = settings.systemPrompt || '';
  }

  providerSel.addEventListener('change', function () {
    settings.apiKeys[settings.provider] = apiKeyIn.value.trim();
    settings.models[settings.provider]  = modelIn.value.trim();
    settings.provider = providerSel.value;
    apiKeyIn.value = settings.apiKeys[settings.provider] || '';
    modelIn.value  = settings.models[settings.provider] || '';
  });

  function openSheet()  { fillSheet(); sheet.classList.add('open'); apiKeyIn.focus(); }
  function closeSheet() { sheet.classList.remove('open'); input.focus(); }

  document.getElementById('cog').addEventListener('click', openSheet);
  document.getElementById('sheetCancel').addEventListener('click', function () {
    refreshSettings().then(closeSheet);
  });
  document.getElementById('sheetSave').addEventListener('click', function () {
    settings.provider = providerSel.value;
    settings.apiKeys[settings.provider] = apiKeyIn.value.trim();
    settings.models[settings.provider]  = modelIn.value.trim();
    settings.shortcut     = shortcutIn.value.trim();
    settings.systemPrompt = sysIn.value;
    bridge.saveSettings(settings).then(function (saved) {
      settings = saved;
      updateLink();
      closeSheet();
    });
  });

  /* Esc closes the sheet first; only leaves fullscreen when no sheet is open */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'F11') { e.preventDefault(); bridge.toggleFullscreen(); return; }
    if (e.key !== 'Escape') return;
    if (sheet.classList.contains('open')) refreshSettings().then(closeSheet);
    else if (document.body.classList.contains('fullscreen')) bridge.exitFullscreen();
  });

  /* ---------- link status ---------- */
  function hasKey() { return !!(settings.apiKeys[settings.provider] || '').trim(); }

  function updateLink() {
    var status = document.getElementById('status');
    var text   = document.getElementById('linkText');
    status.classList.toggle('nokey', !hasKey());
    text.textContent = hasKey() ? 'link stable' : 'no key — open settings';
  }

  function refreshSettings() {
    return bridge.getSettings().then(function (s) { settings = s; return s; });
  }

  /* ---------- boot ---------- */
  refreshSettings().then(function () {
    updateLink();
    addEntry('system', 'E.V. booted. voice link text-only in this build — talk to her like you would through the earpiece.');
    if (hasKey()) {
      addEntry('ev', "Hey. I'm up. What's going on out there?");
      setScan('idle');
    } else {
      addEntry('ev', "I'm awake, but the uplink's dead — no API key on the rig yet. Open settings and give me one.");
      setScan('offline');
      setTimeout(openSheet, 600);
    }
    input.focus();
  });
})();
