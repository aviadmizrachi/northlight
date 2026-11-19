# Northlight — design

Status: draft for approval · 2026-11-18 · owner: aviadmizrachi

## 1. Intent

A free public web page that plays endless music that feels like music made by artists: it grows,
breaks down, drops, changes instruments, and changes harmony. Anyone can press Play with no account.
People who have an AI music key can switch to an AI source. They must trust that their key never
leaves their browser except to go to the provider they chose.

Today there are two local pages in `~/sanbox/aviad/focus-music/`:

- `index.html` — the built-in engine (Tone.js, real piano/violin/cello samples in `samples.js`).
- `ai.html` — Google Lyria RealTime with styles, climates, a journey (phase arrangement), palettes
  and a stream-health readout.

## 2. Goals, non-goals, anti-goals

Goals

- G1. One public page at `https://aviadmizrachi.github.io/northlight/`, source in the public repo
  `aviadmizrachi/northlight` (personal account, not frontegg).
- G2. Five sources behind one player: Built-in (no key), Google Lyria RealTime, ElevenLabs Music,
  Stability Stable Audio, fal.ai.
- G3. More music: the journey, palettes and 16-bar changes from `ai.html` drive every source,
  including the built-in engine.
- G4. More harmony: more modes and progressions, and more genres, each genre with its own harmony rules.
- G5. Clean code: small ES modules, no build step, unit tests, lint, format, CI, deploy on merge.
- G6. Key trust that people can see and check (section 6).

Non-goals

- No accounts, no backend in the first release, no analytics, no ads.
- No vocals with words. No download/export of tracks in the first release.
- No mobile app. The page must work on a phone browser, that is all.

Anti-goals (failure even if it works)

- A key, ours or a visitor's, that reaches any host other than the chosen provider.
- A shared key inside the page source.
- A visitor who spends money without knowing it (clip sources cost per clip).
- Music that loops the same 8 bars for minutes.

## 3. Facts from research (2026-11-18)

| Source | Mode | Browser call with visitor key | Cost (verify at build) | Notes |
| --- | --- | --- | --- | --- |
| Built-in | local synthesis | n/a | free | Tone.js 14.8.49 + samples |
| Lyria RealTime | endless stream (WebSocket, 48 kHz PCM) | works today (`ai.html`) | price not published; experimental model `lyria-realtime-exp` | instrumental, watermarked, ≤2 s control latency |
| ElevenLabs Music | clips 3 s – 5 min (`/v1/music`, `/v1/music/stream`) | CORS `*` verified | about $0.15/min (not verified) | paid plans only; set `model_id: "music_v2_5"` (`music_v1` ends 2027-01-31); keys can be scoped + credit-capped |
| Stability Stable Audio | clips up to 190 s (2.5) / 380 s (3.0) | CORS `*` verified | 8 credits ≈ $0.08 per clip | `POST /v2beta/audio/stable-audio-2/text-to-audio` |
| fal.ai | clips, many models (Stable Audio 2.5, MiniMax Music, ACE-Step, Lyria 2/3, ElevenLabs) | CORS works; fal docs advise a server proxy | $0.0002/s (ACE-Step) – $0.20/clip | call the REST queue API with `fetch`, not `@fal-ai/client` |

Only Lyria streams without end. The other three make clips, so the player chains clips (section 5.3).

## 4. Decided by the owner

- Public repo + GitHub Pages under the personal account `aviadmizrachi`.
- All five sources.
- Harmony = more modes and progressions AND more genres.
- Code = ES modules, no build, tests, ESLint, Prettier, GitHub Actions CI, Pages deploy on merge.
- Key trust must be clear on the page.
- A "pre-limited key" was asked for; the safe form is a proxy (section 9), after the first release.

## 5. Architecture

### 5.1 One player, many engines

```
UI (controls, key panel, mix view, journey bar)
   │  MusicState  { genre, climate, phase, section, palette, energy, variety, melody, bpm, scale }
   ▼
Conductor (journey clock: phases, 16-bar turns, key changes, palette swaps) — pure logic
   │  state changes
   ▼
Engine interface ── builtin │ lyria │ elevenlabs │ stability │ fal
   │  audio
   ▼
Audio out (master gain, limiter, analyser for the scope)
```

The conductor owns the music plan. Engines only translate `MusicState` into their own controls:

- built-in → sections, chords, instruments, layer thresholds;
- Lyria → weighted prompts + `musicGenerationConfig` (as `ai.html` does now);
- clip engines → one text prompt per clip, built from the phase the clip will cover.

Engine contract (JSDoc-typed):

```js
/** @typedef {{ id, name, kind: "local"|"stream"|"clips", needsKey: boolean,
 *   keyHelp: string, hosts: string[], costHint(state): string|null,
 *   start(ctx: AudioContext, out: AudioNode, state: MusicState): Promise<void>,
 *   update(state: MusicState, change: string[]): void,
 *   stop(): Promise<void>, health(): EngineHealth }} Engine */
```

### 5.2 Files (no build step)

```
index.html              app shell, CSP meta (section 6)
src/app.js              wiring only
src/core/state.js       MusicState + persistence (localStorage "northlight.*")
src/core/conductor.js   journey, sections, turns; time injected → testable
src/core/theory.js      modes, progressions, voice leading, chord names
src/core/genres/*.js    one file per genre: harmony rules + palette tags + engine hints
src/core/keys.js        key store: saved | session-only | forget
src/audio/out.js        master chain, scope
src/audio/pcmStream.js  jitter buffer for Lyria (from ai.html, with gap reasons)
src/audio/clipQueue.js  prefetch + crossfade for clip engines
src/engines/builtin/*   the Tone.js engine split into instruments / sequencer / samples
src/engines/lyria.js  elevenlabs.js  stability.js  fal.js
src/ui/*.js             small render functions, no framework
assets/samples/**.mp3   real files (replace base64 samples.js), lazy-loaded per instrument
test/unit/*.test.js     node:test, no dependencies
test/e2e/*.spec.js      Playwright with fake providers (route interception)
```

Library versions are pinned and loaded from jsDelivr/cdnjs with exact versions
(Tone.js 14.8.49, @google/genai 2.27.0 `+esm`).

### 5.3 Clip engines

- Clip length: the length of the current phase (45–100 s), max 190 s for Stability.
- Prefetch: request clip N+1 when clip N starts; it must be ready ≥10 s before N ends.
- Join: 4 s equal-power crossfade. If N+1 is late, hold the last 8 s of N in a soft loop and show
  "waiting for <provider>" in the health line, as the Lyria page does.
- Prompt per clip = genre tags + climate + palette of that phase + harmony words
  (for example "D Dorian, jazzy ninth chords") + phase words ("breakdown, no drums").
- Continuity: same palette and key for the whole journey; the new key starts at the breakdown,
  as in `ai.html`.
- Tempo and key lock (builder call): every clip prompt names the fixed BPM and key
  ("124 BPM, D minor"). The crossfade lasts 2 bars and starts on a bar line computed from the BPM,
  assuming each clip starts on a downbeat. Small drift is accepted; the e2e test only checks the
  schedule, not the musical fit. If listening shows clashes, the fallback is a short filtered
  "wash" transition (reverb tail + riser) instead of an overlap.

### 5.4 Cost guard (clip engines and Lyria)

- Before the first Play with a clip source: a one-time notice with the price per clip and per hour
  ("about $1.50 per hour with Stability"), plus the provider's own billing page link.
- Setting "Stop after N clips" (default 20 ≈ 30–60 min). The counter shows on the page.
- Lyria (stream, no published price): a sleep timer "Stop after N minutes" (default 60). The
  one-time notice says "Google does not publish a price for this model".
- Prices live in one table `src/engines/prices.js` with a "checked on" date.

## 6. Key trust (visible and checkable)

On the page, next to every key field, a short box:

> Your key stays in this browser. This page has no server. It sends your key only to <provider>,
> straight from your browser. The code is public: read it on GitHub. Use "Forget key" to delete it.

Mechanics that make the text true and checkable:

- Keys are stored in `localStorage` under `northlight.key.<engine>`, or only in memory when the
  visitor picks "Don't save (this tab only)".
- A Content-Security-Policy meta tag lists the only hosts the page may connect to:
  `connect-src` = the four provider API hosts (incl. `wss://generativelanguage.googleapis.com`) and
  the sample/CDN hosts; `script-src` = self + pinned CDN hosts. Anyone can read it in the source,
  and the browser blocks any other host.
- No analytics, no service worker in the first release.
- CSP detail (builder call): no inline scripts (all code in `src/*.js` modules); CSS in `src/app.css`,
  `style-src 'self'`; fonts self-hosted in `assets/fonts/` (Google Fonts links are removed);
  `script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`. The builder confirms
  in PR 1 that `@google/genai` `+esm` loads only from jsDelivr and needs no `eval`; if it needs more,
  the SDK is replaced by a direct WebSocket client (the protocol is small: setup, clientContent,
  musicGenerationConfig, playbackControl).
- The README has a "Your key" section with the same text and a link to the CSP line.
- For ElevenLabs the key help says how to make a key that is limited to the Music endpoint with a
  credit quota. Google keys: suggest a project spend cap.

## 7. Music and harmony

### 7.1 Theory (`theory.js`)

- Modes: ionian, dorian, phrygian, lydian, mixolydian, aeolian, harmonic minor.
- Chords: triads, 7ths, 9ths, add9, sus2, sus4, 11 (in minor), slash bass.
- Progression families per genre, with weights; modal mixture (borrowed iv, ♭VI, ♭VII);
  pedal-point sections; voice leading by smallest movement (as `index.html` does today).
- Key changes: at the breakdown (relative or by a 4th/5th), and an optional lift (+1 or +2 semitones)
  for the final drop.

### 7.2 Genres

Keep: Nordic minimal, High-tech minimal, Deep techno, Melodic techno, Dark melodic,
Progressive house, Organic house, Acid techno, Ambient techno.
Add: Lo-fi, Neo-classical, Jazz house, Cinematic, Downtempo, Synthwave.

Each genre file holds: BPM range, swing, modes allowed, progression families, chord extensions,
journey phase lengths, palette pools (Lyria-vocabulary tags for AI sources), and the built-in
instrument mapping.

### 7.3 Built-in engine, more instruments

Today's engine (`index.html`): one IIFE with sections/arcs (`makeSection`, `ARCS`), a 16th-note
`tick16` loop on `Tone.Transport`, `onBar` for chords and layers, and Tone.Sampler instruments
decoded from base64 `samples.js`. PR 2 moves this code into modules with no musical change
(same sections, arcs, layers, levels); a fixed-seed test compares the planned sections and
chords before and after. PR 3 replaces `makeSection` planning with the conductor.

Samples: PR 2 decodes `samples.js` into `assets/samples/<instrument>/<note>.mp3` (about 2.3 MB,
far under the Pages 1 GB limit) and records the source of each set in `CREDITS.md`
(Salamander Grand Piano, CC-BY 3.0; nbrosowsky tonejs-instruments — the builder confirms the
license before publishing).

Add sampled instruments from the same open sample set used today (nbrosowsky tonejs-instruments):
harp, nylon guitar, flute, saxophone, xylophone, contrabass. Load each instrument only when a
genre uses it. Credits and licenses in `CREDITS.md` (Salamander piano and the tonejs-instruments
set; the builder confirms each license before adding a file).

The built-in engine follows the conductor: the same phases, 16-bar turns, palette swaps and
key change at the breakdown as the AI sources.

## 8. Quality

- ESLint (flat config) + Prettier; `npm run check` = lint + format check + unit + e2e.
- Unit tests for every pure module: theory, conductor (fake clock), genres (schema check),
  keys, prompt builders, clip queue scheduling, prices.
- E2E (Playwright, Chromium): the page loads with no console errors; each engine plays against a
  fake provider (route interception, as in today's puppeteer harness); key save/forget/session;
  CSP blocks an unknown host; phone width 390 px has no horizontal scroll.
- GitHub Actions: `check` on every PR; deploy to Pages on merge to `main` after `check` passes.
- Branch rule: work on branches + PRs; `main` is protected after the first commit.
- Lyria e2e fake: intercept the `@google/genai` module URL and serve a fake `GoogleGenAI` that
  records calls and emits PCM chunks (proven in the current puppeteer harness). The direct
  WebSocket client, if used, gets a local mock WebSocket server in the test.
- Phones: audio starts on the Play tap (iOS gesture rule). Playback with the screen locked is not
  required in the first release; the Media Session API gives lock-screen Play/Pause where the
  browser supports it.

## 9. Later: the demo key (not in the first release)

A Cloudflare Worker holds one provider key as a secret. The page calls the Worker only in
"Demo" mode. A Durable Object counts minutes per IP per day (for example 10 min/day).
The provider account has a hard monthly spend cap. Lyria's WebSocket can be relayed by the
Worker; each session gets a time cap. The Worker URL is added to the CSP. Which provider and the
monthly cap are owner decisions at that time.

## 10. Delivery plan (each PR stands on its own)

1. Bootstrap: Claude creates the public repo `aviadmizrachi/northlight` with the owner's `gh` login
   (after the owner approves this design), enables Pages (GitHub Actions source), and pushes the
   current two pages as they are, README with the key text, LICENSE,
   CSP, Pages deploy, CI with lint + a smoke test. → the page is public.
2. Module split with no behavior change; samples as files; unit + e2e tests.
3. One player: engine interface, conductor shared by built-in and Lyria; one page.
4. Clip engines: Stability, ElevenLabs, fal + clip queue + cost guard.
5. Harmony: `theory.js` modes/progressions + the 6 new genres for all engines.
6. Built-in instruments: new samples + credits.
7. (Later, owner decision) demo key Worker.

## 11. Open points

- License for the code (MIT suggested). Sample licenses are listed per file in `CREDITS.md`.
- Name: keep "Northlight"?
- Lyria price and session limit are not published; the page shows "price not published by Google".
