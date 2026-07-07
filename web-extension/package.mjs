#!/usr/bin/env node
// Packages the runtime files into a distributable zip for Chrome (Load unpacked /
// Web Store) and Firefox (about:debugging / AMO). One zip serves both — the
// Firefox id lives in manifest.json's browser_specific_settings, which Chrome and
// Safari ignore. Run: node package.mjs

import { execFileSync } from 'node:child_process'
import { rmSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
mkdirSync(join(here, 'dist'), { recursive: true })

const out = join(here, 'dist', 'web-extension.zip')
rmSync(out, { force: true })

const files = ['manifest.json', 'enhance.css', 'layout-engine.js']
// -X: no extra file attributes → reproducible-ish; run from `here` so paths are flat.
execFileSync('zip', ['-X', out, ...files], { cwd: here, stdio: 'inherit' })

console.log('Wrote dist/web-extension.zip (%s)', files.join(', '))
