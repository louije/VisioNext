#!/usr/bin/env node
// Builds a bookmarklet from enhance.css — the single source of truth shared
// with the Chrome/Safari extensions. Emits:
//   dist/bookmarklet.txt  — the `javascript:` one-liner
//   dist/install.html     — a drag-to-bookmarks-bar install page
//
// Run: node build-bookmarklet.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dist = join(here, 'dist')
mkdirSync(dist, { recursive: true })

// Strip /* … */ comments and collapse whitespace so the payload stays small.
const css = readFileSync(join(here, 'enhance.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .trim()

// Idempotent: re-clicking removes the injected style (toggle behaviour).
const code =
  "(()=>{const id='vn-meet-strip';const e=document.getElementById(id);" +
  "if(e){e.remove();return;}" +
  "const s=document.createElement('style');s.id=id;" +
  `s.textContent=${JSON.stringify(css)};` +
  'document.head.appendChild(s);})();'

const bookmarklet = 'javascript:' + encodeURIComponent(code)

writeFileSync(join(dist, 'bookmarklet.txt'), bookmarklet + '\n')

const html = `<!doctype html>
<html lang="en"><meta charset="utf-8">
<title>VisioNext — Meet multi-column strip bookmarklet</title>
<style>
  body{font:16px/1.5 system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem}
  a.bm{display:inline-block;padding:.5rem 1rem;background:#000091;color:#fff;
       border-radius:.4rem;text-decoration:none;font-weight:600}
  code{background:#eee;padding:.1rem .3rem;border-radius:.2rem}
</style>
<h1>Meet multi-column strip</h1>
<p>Drag this button to your bookmarks bar, then click it on
<code>visio.numerique.gouv.fr</code> while a screen is shared:</p>
<p><a class="bm" href="${bookmarklet.replace(/"/g, '&quot;')}">🧑‍🤝‍🧑 Meet grid</a></p>
<p>Click again to toggle it off.</p>
</html>
`
writeFileSync(join(dist, 'install.html'), html)

console.log('Wrote dist/bookmarklet.txt (%d bytes) and dist/install.html', bookmarklet.length)
