// /frostbyte/os-bridge.js — copied verbatim from game1/os-bridge.js (only the ready title differs).
// Include BEFORE main.js; main.js calls window.__osBridge hooks.
// Implements the os-bridge-v1 protocol (DOMINIKOS-PLAN §8.1): the DominikOS window manager
// posts pause/resume/mute; the game answers with ready/paused/resumed using the ENGINE's real
// pause API (never a requestAnimationFrame monkey-patch). Drop this file + a ~6-line onReady
// hook into any future iframe game to make it OS-embeddable.
(function () {
  const CH = 'os-bridge-v1';
  const send = (t, d = {}) => parent.postMessage({ ch: CH, type: t, ...d }, '*');
  window.__osBridge = {
    onReady: (api) => { // api = { pause(), resume(), setMute(b) } provided by main.js using KAPLAY
      addEventListener('message', (e) => {
        const m = e.data;
        if (!m || m.ch !== CH) return;
        if (m.type === 'pause') { api.pause(); send('paused'); }
        else if (m.type === 'resume') { api.resume(); send('resumed'); }
        else if (m.type === 'mute') { api.setMute(m.value); }
      });
      send('ready', { title: 'Frostbyte' });
    },
  };
})();
