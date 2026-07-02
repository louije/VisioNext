# Meet multi-column people strip

A tiny CSS tweak for [Meet / La Suite numérique](https://visio.numerique.gouv.fr)
(built on LiveKit). When a screen is shared, Meet's focus layout squeezes everyone
else into a **single vertical scrolling column**. This makes that strip **auto-wrap
into multiple columns**, so you see more faces at once. No UI, no JavaScript logic —
just a stylesheet.

`enhance.css` is the single source of truth, delivered three ways.

## Design notes

See [`../docs/superpowers/specs/2026-07-02-meet-multicolumn-strip-design.md`](../docs/superpowers/specs/2026-07-02-meet-multicolumn-strip-design.md).
Tunables live at the top of `enhance.css`: `--vn-carousel-max` (how wide the strip
may grow, default `34vw`) and `--vn-min-tile` (min tile width before wrapping,
default `132px`).

> The selectors were validated against LiveKit's stock CSS and Meet's source, not
> the live DOM. If on the live site the strip converts to a grid but does **not**
> widen, uncomment the generic fallback block (section 1b) in `enhance.css`.

## 1. Bookmarklet (any browser, zero install)

```sh
node build-bookmarklet.mjs
```

This writes `dist/bookmarklet.txt` (the `javascript:` one-liner) and
`dist/install.html`. Open `dist/install.html`, drag the button to your bookmarks
bar, then click it on `visio.numerique.gouv.fr` while a screen is shared. Click
again to toggle it off.

## 2. Chrome / Chromium (unpacked extension)

This folder **is** the extension.

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this `web-extension/` directory.

It injects `enhance.css` on `visio.numerique.gouv.fr` (and `localhost` for local
Meet dev).

## 3. Safari (bundled with VisioNext.app)

The Safari Web Extension ships inside the VisioNext menu-bar app as the
`VisioSafariExtension` target (see `../App/project.yml`). It reuses the same
`manifest.json` + `enhance.css` from this folder.

```sh
cd ../App && xcodegen generate && open VisioNext.xcodeproj
```

Build & run VisioNext, then enable the extension in **Safari → Settings →
Extensions**. (You may need to allow unsigned extensions via **Develop → Allow
Unsigned Extensions** during development.)

## Files

| File | Role |
|------|------|
| `enhance.css` | The override — single source of truth |
| `manifest.json` | MV3 manifest (Chrome + Safari) |
| `build-bookmarklet.mjs` | Generates `dist/bookmarklet.txt` + `dist/install.html` |
