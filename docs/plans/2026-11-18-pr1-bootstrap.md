# PR 1 — Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the two current pages at `https://aviadmizrachi.github.io/northlight/` from the public repo `aviadmizrachi/northlight`, with visible key-trust text, a strict CSP, lint/format/e2e checks in CI, and deploy on merge.

**Architecture:** Static site, no build. Inline `<script>`/`<style>` move into files under `src/` so the CSP can forbid inline code. Fonts are self-hosted. Playwright runs the pages against a fake Lyria (module-URL interception). Two GitHub Actions workflows: `check` (PRs and `main`) and `deploy` (Pages, after `check`).

**Tech Stack:** HTML + ES modules, Tone.js 14.8.49 (cdnjs), @google/genai 2.27.0 `+esm` (jsDelivr), Node 22, ESLint 9 (flat config), Prettier 3, @playwright/test (Chromium), GitHub Pages via `actions/deploy-pages`.

**Spec:** `docs/DESIGN.md` (sections 4, 6, 8, 10 item 1).

## Global Constraints

- Repo: `aviadmizrachi/northlight`, public, personal account (`gh` active login `aviadmizrachi`). Never a `frontegg/*` repo.
- License: MIT, `Copyright (c) 2026 Aviad Mizrachi`.
- Name in UI and README: "Northlight" (built-in page) and "Northlight AI" (Lyria page).
- No behavior change to the music in this PR: only file moves, the key box, the "Don't save" option, CSP, nav links.
- Pinned versions only: `tone/14.8.49`, `@google/genai@2.27.0/+esm`.
- localStorage keys keep their current names: `northlight.*` and `northlight-ai.*` (visitors' saved settings survive).
- Key text (exact copy, section 6 of the spec):
  "Your key stays in this browser. This page has no server. It sends your key only to Google, straight from your browser. The code is public: read it on GitHub. Use \"Forget key\" to delete it."
- Work in `~/sanbox/aviad/focus-music/` (becomes the repo root). Only the initial README+LICENSE commit goes to `main` directly; everything else lands through the PR `bootstrap`.

## Review Focus

1. No key saved and Play pressed on `ai.html` → status says to add a key; no request to any Google host. (Task 3 test `no key → no network`.)
2. Wrong key → status shows the provider error; the key text never appears in the page text or the console. (Task 3 test `bad key is not echoed`.)
3. localStorage blocked (private mode / throws) → both pages still load and play; "Don't save" still works. (Task 3 test `storage throws`.)
4. Tone.js CDN fails → built-in page shows a readable error, not a blank Play. (Task 2 test `cdn down`.)
5. Phone width 390 px → no horizontal scroll on either page. (Task 4 test `phone width`.)

---

### Task 1: Repo skeleton, tooling, initial commit

**Files:**
- Create: `README.md`, `LICENSE`, `.gitignore`, `package.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`
- Keep in place: `index.html`, `ai.html`, `samples.js`, `docs/**`

**Interfaces:**
- Produces: npm scripts `lint`, `format:check`, `test:e2e`, `check` (= lint && format:check && test:e2e), `serve` (static server on port 4173 used by Playwright `webServer`).

- [ ] **Step 1:** `git init -b main` in `~/sanbox/aviad/focus-music`; `.gitignore` = `node_modules/`, `test-results/`, `playwright-report/`, `.DS_Store`.
- [ ] **Step 2:** `README.md` with: one-line intro, the two page links on `aviadmizrachi.github.io/northlight/`, a "Your key" section with the exact key text plus "The page's Content-Security-Policy (top of `ai.html`) lists the only servers it may contact.", "Run locally" (`npx serve .` or `npm run serve`), "Credits" (Salamander Grand Piano CC-BY 3.0; nbrosowsky tonejs-instruments; Tone.js MIT). `LICENSE` = MIT text with the constraint's copyright line.
- [ ] **Step 3:** Commit README + LICENSE + .gitignore only: `git commit -m "chore: initial README and MIT license"`.
- [ ] **Step 4:** Create the repo and push `main`:
  `gh repo create aviadmizrachi/northlight --public --source . --remote origin --push --description "Endless generative music in your browser"`.
  Expected: repo URL printed; `git ls-remote origin main` shows the commit.
- [ ] **Step 5:** `git switch -c bootstrap`. `package.json` (`"type": "module"`, `"private": true`, engines node >=22), devDependencies: `eslint@^9`, `@eslint/js@^9`, `globals`, `prettier@^3`, `@playwright/test`, `serve`. ESLint flat config: browser globals + `Tone` readonly for `src/builtin.js`, node globals for `test/**` and config files. Prettier: `printWidth 140` (matches today's long lines), ignore `samples.js` and `docs/`.
- [ ] **Step 6:** `npm install`; run `npm run lint` and `npm run format:check`. Expected: both fail only on files not yet moved (Task 2 fixes them). Commit `chore: tooling (eslint, prettier, playwright)`.

### Task 2: Move inline code and fonts out of the HTML; CDN-failure message

**Files:**
- Create: `src/builtin.js` (from `index.html:162-1016` inline script), `src/builtin.css` (`index.html:8-94`), `src/ai.js` (from `ai.html:137-572`, stays `type="module"`), `src/ai.css` (`ai.html:5-66`), `assets/fonts/*.woff2` + `src/fonts.css`
- Modify: `index.html`, `ai.html` (link the new files; remove Google Fonts `<link>`s and preconnects; add a small nav: "Built-in" ↔ "AI (Lyria)")
- Test: `test/e2e/builtin.spec.js`, `playwright.config.js`

**Interfaces:**
- Produces: pages that contain no inline `<script>` body and no `<style>` element (Task 4 CSP relies on this). Font families keep their names: "IBM Plex Sans", "IBM Plex Mono", "Syne" (weights 400/500, Syne 500/700) via `@font-face` in `src/fonts.css`.

- [ ] **Step 1: Write the failing tests** in `test/e2e/builtin.spec.js`:
  - `plays`: open `/`, click `#play` (current id), wait 3 s; assert `await page.evaluate(() => Tone.context.state) === "running"`, and zero `console` errors / `pageerror`s collected.
  - `cdn down`: `page.route("**/tone/14.8.49/Tone.js", r => r.abort())`, open `/`; assert an element with role `alert` contains "could not load".
  - `no inline code`: fetch `/` and `/ai.html` as text; assert no `<style` and no `<script>` with a non-empty body.
- [ ] **Step 2:** `npx playwright test test/e2e/builtin.spec.js`. Expected: `cdn down` and `no inline code` FAIL.
- [ ] **Step 3:** Move the code verbatim (only change: none to logic). Download the woff2 files from the Google Fonts CSS URL in `ai.html:4` (Latin subset) into `assets/fonts/`; add `OFL.txt` next to them. In `src/builtin.js` first line: if `typeof Tone === "undefined"`, render `<p role="alert">Northlight could not load its audio library. Check your connection and reload.</p>` into the header and stop.
- [ ] **Step 4:** Run the spec. Expected: 3 PASS. Run `npm run lint && npm run format:check` (format with `npx prettier --write src test`). Expected: clean.
- [ ] **Step 5:** Commit `refactor: move inline code and fonts into files`.

### Task 3: Key trust box and "Don't save" on the Lyria page

**Files:**
- Modify: `ai.html` (key section), `src/ai.js` (`store` object, key handling), `src/ai.css`
- Test: `test/e2e/ai-key.spec.js`, `test/e2e/fake-genai.js` (fake module source, ported from `scratchpad/nltest/ai-journey.mjs`)

**Interfaces:**
- Consumes: Task 2 file layout.
- Produces: `test/e2e/fake-genai.js` exports `installFakeGenai(page, { connectError?: string })` — routes `**/@google/genai@2.27.0/+esm` to a fake `GoogleGenAI` module (with `Access-Control-Allow-Origin: *`) that records calls in `window.__calls` and emits 0.5 s silent PCM chunks every 500 ms. Task 4 reuses it.
- Key memory: a module-level `sessionKey` variable; `getKey()` returns `sessionKey ?? store.get("key")`.

- [ ] **Step 1: Write the failing tests** in `test/e2e/ai-key.spec.js`:
  - `trust text`: the page text contains the exact key text from Global Constraints, and a link to `https://github.com/aviadmizrachi/northlight`.
  - `save`: fill `#key` with `test-key-123`, click `#saveKey`; `localStorage["northlight-ai.key"] === "test-key-123"`; `#key` value is empty.
  - `session only`: check `#keySession` ("Don't save (this tab only)"), fill, save; localStorage has no `northlight-ai.key`; Play with the fake connects (`window.__calls` contains `play`).
  - `forget`: after save, click `#forgetKey`; key gone from localStorage and memory (Play shows "Add your Gemini API key first.").
  - `no key → no network`: no key, click Play; status text contains "Add your Gemini API key"; no request URL contains `googleapis.com` and the fake's connect was not called.
  - `bad key is not echoed`: `installFakeGenai(page, { connectError: "API key not valid" })`, save `bad-key-xyz`, Play; status contains "API key not valid"; `document.body.innerText` and all console messages do not contain `bad-key-xyz`.
  - `storage throws`: `page.addInitScript` that makes `localStorage.getItem/setItem` throw; page loads with no `pageerror`; session-only save + Play works.
- [ ] **Step 2:** Run. Expected: FAIL (no trust text, no `#keySession`).
- [ ] **Step 3:** Add under the key row: `<p class="trust">` with the exact text and the GitHub link, and `<label class="check"><input id="keySession" type="checkbox"> Don't save (this tab only)</label>`. Save: if `#keySession` checked → `sessionKey = value`, remove any stored key; else store. Forget: clear both. `connect()` uses `getKey()`.
- [ ] **Step 4:** Run. Expected: 7 PASS. Lint + format clean.
- [ ] **Step 5:** Commit `feat: key trust text and session-only key`.

### Task 4: CSP, Lyria smoke, phone width

**Files:**
- Modify: `index.html`, `ai.html` (`<meta http-equiv="Content-Security-Policy">` as the first element in `<head>` after charset)
- Test: `test/e2e/csp.spec.js`, `test/e2e/ai-play.spec.js`

**Interfaces:**
- Consumes: `installFakeGenai` (Task 3).

CSP values (exact):
- `index.html`: `default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self'; font-src 'self'; img-src 'self' data:; media-src 'self' data: blob:; connect-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'`
- `ai.html`: same, plus `script-src` adds `https://cdn.jsdelivr.net`, `connect-src` adds `https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com`.
  (`data:` in connect/media: `samples.js` decodes base64 via `fetch`/`decodeAudioData`; drop it if Step 2 shows it unused.
  Tone.js 14.8 may register its AudioWorklet from a `blob:` URL; if `no violations on load` reports a `blob:` script, add `blob:` to `script-src` on `index.html` only.)

- [ ] **Step 1: Write the failing tests:**
  - `csp.spec.js` `blocks unknown hosts`: on each page, `page.evaluate(() => fetch("https://example.com").then(() => "ok", () => "blocked"))` returns `"blocked"`, and a `securitypolicyviolation` event fired.
  - `csp.spec.js` `no violations on load`: open each page, Play for 3 s (fake genai on `ai.html`); collected `securitypolicyviolation` events = 0; console errors = 0. This also proves `@google/genai` `+esm` needs no `eval` and no other host — run this one once against the REAL jsDelivr module (no fake) with `connect` stubbed by routing `wss://` to abort; record the result in the PR description.
  - `ai-play.spec.js` `plays with fake lyria`: save key, Play, wait 6 s; `window.__calls` has `prompts`, `config`, `play`; `#health` text contains "real time".
  - `ai-play.spec.js` `phone width` (viewport 390×844) for `/` and `/ai.html`: `document.documentElement.scrollWidth <= 390`.
- [ ] **Step 2:** Run. Expected: `blocks unknown hosts` FAIL (no CSP yet); others may pass.
- [ ] **Step 3:** Add the CSP meta tags. If the real-module run shows a violation, list the blocked URL in the PR and stop (the spec's fallback — a direct WebSocket client — is PR 3 scope, not this PR).
- [ ] **Step 4:** Run the whole suite `npm run check`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat: content security policy`.

### Task 5: CI, Pages deploy, PR

**Files:**
- Create: `.github/workflows/check.yml`, `.github/workflows/deploy.yml`

**Interfaces:**
- `check.yml`: on `pull_request` and `push` to `main`; ubuntu-latest, Node 22, `npm ci`, `npx playwright install --with-deps chromium`, `npm run check`; upload `playwright-report/` on failure.
- `deploy.yml`: on `workflow_run` of `check` completed on `main` with conclusion success (and `workflow_dispatch`); permissions `pages: write`, `id-token: write`; copy `index.html ai.html samples.js src assets LICENSE` into `_site/`; `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`. Docs, tests and `node_modules` are not published.

- [ ] **Step 1:** Write both workflows. `npx prettier --check .github`.
- [ ] **Step 2:** Enable Pages with Actions as source: `gh api -X POST repos/aviadmizrachi/northlight/pages -f build_type=workflow`. Expected: JSON with `"build_type":"workflow"`.
- [ ] **Step 3:** Push `bootstrap`, open the PR: `gh pr create --base main --head bootstrap --title "Bootstrap: public pages, key trust, CSP, CI"` with a body listing Tasks 1–5, the Review Focus results and the real-module CSP result.
- [ ] **Step 4:** Wait for `check` on the PR. Expected: green. If red, fix on the branch and push.
- [ ] **Step 5:** Hand the PR to the owner to merge. After merge: `deploy` runs; open `https://aviadmizrachi.github.io/northlight/` and `/ai.html`; expected: both load, Play works on the built-in page.
- [ ] **Step 6:** Protect `main`: `gh api -X PUT repos/aviadmizrachi/northlight/branches/main/protection` with required status check `check`, no force push, PRs required (owner can still merge).

---

## Outline of later PRs (each gets its own plan when it starts)

- **PR 2 — Module split, no sound change.** `src/core/theory.js`, `src/engines/builtin/{instruments,sequencer,samples}.js`, `src/core/keys.js`, `src/audio/pcmStream.js`; `samples.js` → `assets/samples/<instrument>/<note>.mp3` + `CREDITS.md`; node:test unit tests; fixed-seed test that the built-in engine plans the same sections and chords before and after.
- **PR 3 — One player.** `MusicState`, `src/core/conductor.js` (fake-clock tests), Engine interface, built-in + Lyria engines under one `index.html`; `ai.html` redirects to `/?source=lyria`.
- **PR 4 — Clip engines.** `stability.js`, `elevenlabs.js` (`music_v2_5`), `fal.js` (REST queue API), `src/audio/clipQueue.js` (prefetch, 2-bar crossfade on the bar grid), cost guard + `prices.js`, Lyria sleep timer; CSP `connect-src` adds `https://api.stability.ai https://api.elevenlabs.io https://queue.fal.run https://fal.run`.
- **PR 5 — Harmony and genres.** Modes, extensions, modal mixture, key-change rules in `theory.js`; six new genre files (Lo-fi, Neo-classical, Jazz house, Cinematic, Downtempo, Synthwave); prompt-word mapping for AI engines.
- **PR 6 — Built-in instruments.** Harp, nylon guitar, flute, saxophone, xylophone, contrabass samples (lazy-loaded), licenses confirmed in `CREDITS.md`.
- **Later — Demo key Worker** (spec section 9), on owner decision.
