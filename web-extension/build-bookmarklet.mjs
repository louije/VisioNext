#!/usr/bin/env node
// Builds a bookmarklet from enhance.css + layout-engine.js — the same sources the
// Chrome/Safari extensions ship. Emits:
//   dist/bookmarklet.txt  — the `javascript:` one-liner (toggles on/off)
//   dist/install.html     — a drag-to-bookmarks-bar install page
//
// Run: node build-bookmarklet.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dist = join(here, 'dist')
mkdirSync(dist, { recursive: true })

// CSS: drop comments and collapse whitespace (safe for CSS).
const css = readFileSync(join(here, 'enhance.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .trim()

// JS: strip only block comments; KEEP newlines so line comments stay terminated.
const engine = readFileSync(join(here, 'layout-engine.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .trim()

// Toggle: first click injects the stylesheet + starts the engine (which sets
// window.__vnMeet); second click stops the engine and removes the stylesheet.
const code = `(()=>{
const id='vn-meet-strip';
if(window.__vnMeet){window.__vnMeet.stop();const e=document.getElementById(id);if(e)e.remove();return;}
const s=document.createElement('style');s.id=id;s.textContent=${JSON.stringify(css)};document.head.appendChild(s);
${engine}
})();`

const bookmarklet = 'javascript:' + encodeURIComponent(code)
writeFileSync(join(dist, 'bookmarklet.txt'), bookmarklet + '\n')

const html = `<!doctype html>
<html lang="en"><meta charset="utf-8">
<title>VisioNext — adaptive Meet layout bookmarklet</title>
<style>
  body{font:16px/1.5 system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem}
  a.bm{display:inline-block;padding:.5rem 1rem;background:#000091;color:#fff;
       border-radius:.4rem;text-decoration:none;font-weight:600}
  code{background:#eee;padding:.1rem .3rem;border-radius:.2rem}
</style>
<h1>Adaptive Meet layout</h1>
<p>Drag this button to your bookmarks bar, then click it on
<code>visio.numerique.gouv.fr</code> while a screen is shared. It adapts the
participant strip to the shared content and toggles off on a second click.</p>
<p><a class="bm" href="${bookmarklet.replace(/"/g, '&quot;')}">🧑‍🤝‍🧑 Meet layout</a></p>
</html>
`
writeFileSync(join(dist, 'install.html'), html)

console.log('Wrote dist/bookmarklet.txt (%d bytes) and dist/install.html', bookmarklet.length)
