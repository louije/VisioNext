/*
 * VisioNext — adaptive participant-strip layout engine for Meet / LiveKit.
 *
 * Decides where the participant strip goes (beside or below the featured
 * screen/participant) and how many lines it uses, based on the shared content's
 * real aspect ratio — then writes a few hooks onto `.lk-focus-layout` that
 * enhance.css turns into the actual grid:
 *
 *   data-vn-place = "side" | "below"
 *   --vn-lines    = 1 | 2
 *   --vn-strip    = <px>
 *
 * The decision logic (decideLayout) is pure and unit-tested from Node; the DOM
 * controller below only runs in a browser. See the design doc:
 * docs/superpowers/specs/2026-07-02-meet-adaptive-layout-engine-design.md
 */
(function () {
  'use strict';

  var TILE_AR = 16 / 10; // LiveKit `.lk-carousel > *` aspect-ratio (width/height)

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /**
   * Pure layout decision. All inputs are numbers (px / ratio / count).
   * Returns { place: 'side'|'below', lines: 1|2, strip: <px> }.
   */
  function decideLayout(o) {
    var areaW = o.areaW, areaH = o.areaH;
    var count = Math.max(1, o.count | 0);
    var gap = o.gap != null ? o.gap : 8;
    var maxLines = o.maxLines != null ? o.maxLines : 2;
    var maxFraction = o.maxFraction != null ? o.maxFraction : 0.35;
    var minTileW = o.minTileW != null ? o.minTileW : 132;
    var minTileH = o.minTileH != null ? o.minTileH : 100;

    var areaAR = areaW / areaH;
    var known = !!(o.contentAR && isFinite(o.contentAR) && o.contentAR > 0);
    var cAR = known ? o.contentAR : areaAR;

    // Only flip to 'below' when we actually know the content is wider than the
    // area; with unknown content, fall back to the familiar side column.
    if (known && cAR >= areaAR) {
      // BELOW: rows across the width. Grey bars are top/bottom.
      var contentH = areaW / cAR;                       // content fitted to width
      var barSlackH = Math.max(0, areaH - contentH);
      var minRowTileW = minTileH * TILE_AR;             // tile width at min row height
      var perRow = Math.max(1, Math.floor((areaW + gap) / (minRowTileW + gap)));
      var rowsB = clamp(Math.ceil(count / perRow), 1, maxLines);
      var desiredH = rowsB * minTileH + (rowsB - 1) * gap;
      var stripH = Math.min(maxFraction * areaH, Math.max(desiredH, barSlackH));
      return { place: 'below', lines: rowsB, strip: Math.round(stripH) };
    }

    // SIDE: columns down the height. Grey bars are left/right.
    var contentW = areaH * cAR;                         // content fitted to height
    var barSlackW = Math.max(0, areaW - contentW);
    var minColTileH = minTileW / TILE_AR;               // tile height at min col width
    var perCol = Math.max(1, Math.floor((areaH + gap) / (minColTileH + gap)));
    var colsS = clamp(Math.ceil(count / perCol), 1, maxLines);
    var desiredW = colsS * minTileW + (colsS - 1) * gap;
    var stripW = Math.min(maxFraction * areaW, Math.max(desiredW, barSlackW));
    return { place: 'side', lines: colsS, strip: Math.round(stripW) };
  }

  // Export the pure part for the Node test; harmless in the browser.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { decideLayout: decideLayout };
  }

  // ---- DOM controller (browser only) --------------------------------------
  if (typeof document === 'undefined') return;

  var CONFIG = { minTileW: 132, minTileH: 100, maxLines: 2, maxFraction: 0.35 };
  var current = null;   // the bound .lk-focus-layout element
  var ro = null;        // ResizeObserver on it
  var scheduled = false;
  var enabled = false;  // gated on the stored setting (default on); see bootstrap
  var boundVideos = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;

  // Extension storage API (chrome/browser); null in a plain page (bookmarklet).
  var store = (function () {
    var b = (typeof browser !== 'undefined') ? browser
      : (typeof chrome !== 'undefined') ? chrome : null;
    return (b && b.storage && b.storage.local) ? b.storage : null;
  })();

  function gap(el) {
    var v = parseFloat(getComputedStyle(el).getPropertyValue('--lk-grid-gap'));
    return isFinite(v) ? v : 8;
  }

  function setVar(el, name, value) {
    if (el.style.getPropertyValue(name) !== String(value)) {
      el.style.setProperty(name, String(value));
    }
  }

  function apply(focus, d) {
    if (focus.dataset.vnPlace !== d.place) focus.dataset.vnPlace = d.place;
    setVar(focus, '--vn-lines', d.lines);
    setVar(focus, '--vn-strip', d.strip + 'px');
  }

  function clearHooks(focus) {
    delete focus.dataset.vnPlace;
    focus.style.removeProperty('--vn-lines');
    focus.style.removeProperty('--vn-strip');
  }

  function recompute() {
    scheduled = false;
    var focus = current;
    if (!focus || !focus.isConnected) return;
    var rect = focus.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var aside = focus.querySelector(':scope > aside.lk-carousel');
    var count = aside ? aside.querySelectorAll(':scope > .lk-participant-tile').length : 0;
    if (!aside || count === 0) { clearHooks(focus); return; }

    var featured = focus.querySelector(':scope > .lk-participant-tile');
    var video = featured ? featured.querySelector('video') : null;
    if (video && boundVideos && !boundVideos.has(video)) {
      boundVideos.add(video);
      video.addEventListener('resize', schedule);
      video.addEventListener('loadedmetadata', schedule);
    }
    var contentAR = (video && video.videoWidth && video.videoHeight)
      ? video.videoWidth / video.videoHeight : null;

    apply(focus, decideLayout({
      areaW: rect.width, areaH: rect.height, contentAR: contentAR, count: count,
      gap: gap(focus), minTileW: CONFIG.minTileW, minTileH: CONFIG.minTileH,
      maxLines: CONFIG.maxLines, maxFraction: CONFIG.maxFraction,
    }));
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(recompute);
  }

  var mo = new MutationObserver(schedule); // tiles added/removed within focus

  function bind(focus) {
    if (current === focus) return;
    unbind();
    current = focus;
    ro = new ResizeObserver(schedule);
    ro.observe(focus);
    mo.observe(focus, { childList: true, subtree: true });
    schedule();
  }

  function unbind() {
    if (ro) { ro.disconnect(); ro = null; }
    mo.disconnect();
    if (current) clearHooks(current);
    current = null;
  }

  function scan() {
    if (!enabled) { unbind(); return; }
    var focus = document.querySelector('.lk-focus-layout');
    if (focus) bind(focus);
    else unbind();
  }

  function setEnabled(on) {
    enabled = !!on;
    document.documentElement.classList.toggle('vn-on', enabled);
    scan(); // binds when enabled, unbinds + clears hooks when not
  }

  // Watch the SPA: the room (and focus layout) mounts/unmounts over time.
  var rootMo = new MutationObserver(function () {
    if (enabled && (!current || !current.isConnected)) scan();
  });
  rootMo.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', schedule);

  // On/off is stored (default on) and driven from the toolbar popup; a plain page
  // (bookmarklet) has no storage, so it just turns on.
  if (store) {
    store.local.get('enabled')
      .then(function (r) { setEnabled(r.enabled !== false); })
      .catch(function () { setEnabled(true); });
    if (store.onChanged) {
      store.onChanged.addListener(function (ch, area) {
        if (area === 'local' && ch.enabled) setEnabled(ch.enabled.newValue !== false);
      });
    }
  } else {
    setEnabled(true);
  }

  // Teardown handle (used by the bookmarklet to toggle off).
  window.__vnMeet = {
    config: CONFIG,
    setEnabled: setEnabled,
    stop: function () {
      rootMo.disconnect();
      window.removeEventListener('resize', schedule);
      unbind();
      document.documentElement.classList.remove('vn-on');
      delete window.__vnMeet;
    },
    recompute: schedule,
  };
})();
