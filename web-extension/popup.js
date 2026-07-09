// Toolbar popup: a single on/off switch backed by extension storage. The content
// script (layout-engine.js) watches storage.onChanged and applies/removes live.
(function () {
  'use strict';
  var api = (typeof browser !== 'undefined') ? browser
    : (typeof chrome !== 'undefined') ? chrome : null;
  var toggle = document.getElementById('toggle');
  if (!api || !api.storage) { toggle.disabled = true; return; }

  api.storage.local.get('enabled').then(function (r) {
    toggle.checked = r.enabled !== false; // default on
  });
  toggle.addEventListener('change', function () {
    api.storage.local.set({ enabled: toggle.checked });
  });
})();
