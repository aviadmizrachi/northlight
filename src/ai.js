import { GoogleGenAI } from "https://cdn.jsdelivr.net/npm/@google/genai@2.27.0/+esm";

const $ = (s) => document.querySelector(s);
const rnd = Math.random,
  pick = (a) => a[Math.floor(rnd() * a.length)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const store = {
  get(k) {
    try {
      return localStorage.getItem("northlight-ai." + k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      v === null ? localStorage.removeItem("northlight-ai." + k) : localStorage.setItem("northlight-ai." + k, v);
    } catch {
      // storage is blocked: the setting lives only in memory
    }
  },
};

// Lyria responds to short tags (genre, mood, instrument), not to sentences.
// Each journey picks one instrument per role from the style's kit: that set is the track's identity.
const ROLES = ["drums", "bass", "keys", "lead", "feature", "texture"];
const TEXTURES = [
  "Subtle vinyl crackle",
  "Chopped vocal samples",
  "Field recording ambience",
  "Soft rain texture",
  "Spoken word sample",
  "Warm tape hiss",
  "Reversed cymbal swells",
];
const STYLES = {
  nordic: {
    name: "Nordic minimal",
    sub: "Piano, cello, soft kick",
    bpm: 120,
    base: [
      ["Minimal Techno", 1],
      ["Melancholic, Ethereal", 0.6],
    ],
    kit: {
      drums: ["Soft minimal techno drums", "Gentle TR-909 Drum Machine"],
      bass: ["Deep sub bass", "Warm analog bass"],
      keys: ["Smooth Pianos", "Felt piano chords", "Synth Pads"],
      lead: ["Spacey Synths", "Pulsing synth arpeggio"],
      feature: ["Cello", "Viola Ensemble", "Harp", "Glockenspiel"],
      texture: ["Icelandic field recording"],
    },
  },
  hightech: {
    name: "High-tech minimal",
    sub: "Boris Brejcha feel",
    bpm: 125,
    base: [
      ["Minimal Techno, playful high-tech", 1],
      ["Dark, Groovy", 0.6],
    ],
    kit: {
      drums: ["Punchy TR-909 Drum Machine", "Crisp minimal techno drums"],
      bass: ["Rolling 16th-note bassline", "Moog Oscillations bass"],
      keys: ["Dark synth chord stabs", "Synth Pads"],
      lead: ["Quirky detuned saw lead", "Dirty Synths"],
      feature: ["Marimba", "Vibraphone", "Pizzicato strings"],
      texture: ["Pitched vocal chops", "Glitchy laser effects"],
    },
  },
  deep: {
    name: "Deep techno",
    sub: "Dub chords, hypnotic",
    bpm: 124,
    base: [
      ["Deep Techno, dub techno", 1],
      ["Hypnotic, Dark", 0.6],
    ],
    kit: {
      drums: ["Steady deep techno drums", "Muffled TR-909 Drum Machine"],
      bass: ["Rumbling deep bass", "Boomy Bass"],
      keys: ["Dub delay chord stabs", "Rhodes Piano"],
      lead: ["Hypnotic Buchla Synths sequence", "Spacey Synths"],
      feature: ["Alto Saxophone", "Bass Clarinet", "Vibraphone"],
      texture: ["Field recording ambience", "Warm tape hiss"],
    },
  },
  melodic: {
    name: "Melodic techno",
    sub: "Cinematic arpeggios",
    bpm: 123,
    base: [
      ["Melodic Techno", 1],
      ["Emotional, Euphoric", 0.6],
    ],
    kit: {
      drums: ["Driving TR-909 Drum Machine", "Tom percussion groove"],
      bass: ["Pulsing bass sequence", "Rolling analog bass"],
      keys: ["Synth Pads", "Choir pads"],
      lead: ["Soaring synth lead", "Arpeggio with an evolving filter"],
      feature: ["Cello", "Viola Ensemble", "Harp"],
      texture: ["Ethereal vocal samples"],
    },
  },
  afterlife: {
    name: "Dark melodic",
    sub: "Cinematic, epic, emotional",
    bpm: 123,
    base: [
      ["Melodic Techno, cinematic", 1],
      ["Dark, Ominous, Emotional", 0.6],
    ],
    kit: {
      drums: ["Deep driving techno drums"],
      bass: ["Pulsing analog bassline", "Moog Oscillations"],
      keys: ["Synth Pads", "Mellotron choir"],
      lead: ["Huge evolving synth lead", "Buchla Synths arpeggio"],
      feature: ["Cello", "Viola Ensemble", "Bass Clarinet"],
      texture: ["Haunting vocal samples", "Distant bells"],
    },
  },
  progressive: {
    name: "Progressive house",
    sub: "Warm, euphoric, hopeful",
    bpm: 122,
    base: [
      ["Progressive House", 1],
      ["Euphoric, Bright, Nostalgic", 0.6],
    ],
    kit: {
      drums: ["Crisp house drums", "TR-909 Drum Machine"],
      bass: ["Rolling bassline", "Precision Bass"],
      keys: ["Uplifting piano chords", "Rhodes Piano"],
      lead: ["Plucked synth arpeggio", "Spacey Synths"],
      feature: ["Warm Acoustic Guitar", "Slide Guitar", "Harp"],
      texture: ["Airy vocal samples"],
    },
  },
  organic: {
    name: "Organic house",
    sub: "Handpan, desert grooves",
    bpm: 118,
    base: [
      ["Organic House, Deep House", 1],
      ["Groovy, Dreamy", 0.6],
    ],
    kit: {
      drums: ["Djembe and Bongos", "Conga Drums", "Soft house drums"],
      bass: ["Warm round bass", "Precision Bass"],
      keys: ["Rhodes Piano", "Synth Pads"],
      lead: ["Kalimba", "Hang Drum", "Ocarina"],
      feature: ["Flamenco Guitar", "Sitar", "Koto", "Bouzouki", "Woodwinds"],
      texture: ["Desert wind field recording", "Chanted vocal samples"],
    },
  },
  acid: {
    name: "Acid techno",
    sub: "303 lines, raw energy",
    bpm: 132,
    base: [
      ["Acid House, Techno", 1],
      ["Psychedelic, Dark", 0.6],
    ],
    kit: {
      drums: ["Pounding TR-909 Drum Machine", "Industrial percussion"],
      bass: ["303 Acid Bass", "Rolling acid bassline"],
      keys: ["Stabbing rave chords", "Dirty Synths"],
      lead: ["Resonant 303 lead", "Moog Oscillations"],
      feature: ["Rave piano", "Buchla Synths", "Steel Drum"],
      texture: ["Warehouse crowd ambience", "Distorted vocal chops"],
    },
  },
  ambient: {
    name: "Ambient techno",
    sub: "Floating, deep focus",
    bpm: 110,
    base: [
      ["Ambient, Chillout", 1],
      ["Dreamy, Relaxed, Ethereal", 0.6],
    ],
    kit: {
      drums: ["Soft muffled kick", "Gentle minimal percussion"],
      bass: ["Warm sub bass"],
      keys: ["Synth Pads", "Smooth Pianos"],
      lead: ["Glassy arpeggio", "Slow piano melody"],
      feature: ["Harp", "Vibraphone", "Kalimba", "Cello"],
      texture: ["Granular texture", "Distant chimes"],
    },
  },
};
const CLIMATES = {
  shuffle: { name: "Shuffle", sub: "New one each journey" },
  night: { name: "Night drive", sub: "Neon, empty city", text: "Night drive, neon city" },
  rain: { name: "Rain", sub: "Soft, melancholic", text: "Rainy night, melancholic" },
  aurora: { name: "Arctic aurora", sub: "Icy, crystalline", text: "Arctic aurora, icy, crystalline" },
  desert: { name: "Desert sunrise", sub: "Golden, wide open", text: "Desert sunrise, warm, golden" },
  ocean: { name: "Deep ocean", sub: "Blue, weightless", text: "Deep ocean, underwater, weightless" },
  space: { name: "Outer space", sub: "Vast, cosmic", text: "Outer space, cosmic, vast" },
  forest: { name: "Forest dawn", sub: "Misty, alive", text: "Misty forest at dawn, organic" },
  summer: { name: "Summer sunset", sub: "Warm, euphoric", text: "Summer sunset, beach, warm" },
};
// a phase is an arrangement: which roles play and how loud. At most 4 roles at once.
const PHASES = [
  { name: "Intro", dur: 60, level: 0.2, mix: { keys: 0.8, texture: 0.6, drums: 0.3 } },
  { name: "Build", dur: 75, level: 0.7, ramp: true, mix: { keys: 0.6, drums: 0.8, bass: 0.7, lead: 0.4 } },
  { name: "Peak", dur: 90, level: 1, mix: { drums: 1, bass: 0.8, lead: 0.9, keys: 0.4 } },
  { name: "Breakdown", dur: 60, level: 0.35, noDrums: true, mix: { feature: 1, keys: 0.8, texture: 0.5, lead: 0.3 } },
  { name: "Rise", dur: 20, level: 0.8, ramp: true, mix: { drums: 0.6, lead: 0.7, feature: 0.5, keys: 0.4 } },
  { name: "Drop", dur: 100, level: 1, mix: { drums: 1, bass: 0.9, lead: 0.9, feature: 0.6 } },
  { name: "Outro", dur: 45, level: 0.3, ramp: true, mix: { drums: 0.5, keys: 0.7, texture: 0.6, feature: 0.3 } },
];
const FULL = { drums: 0.9, bass: 0.7, lead: 0.7, keys: 0.5 };
const SCALES = [
  "C_MAJOR_A_MINOR",
  "D_FLAT_MAJOR_B_FLAT_MINOR",
  "D_MAJOR_B_MINOR",
  "E_FLAT_MAJOR_C_MINOR",
  "E_MAJOR_D_FLAT_MINOR",
  "F_MAJOR_D_MINOR",
  "G_FLAT_MAJOR_E_FLAT_MINOR",
  "G_MAJOR_E_MINOR",
  "A_FLAT_MAJOR_F_MINOR",
  "A_MAJOR_G_FLAT_MINOR",
  "B_FLAT_MAJOR_G_MINOR",
  "B_MAJOR_A_FLAT_MINOR",
];
const scaleName = (s) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => (w === "flat" ? "♭" : w.length === 1 ? w.toUpperCase() : w))
    .join(" ")
    .replace(/ ♭/g, "♭")
    .replace(/ (major|minor) /, " $1 / ");

const S = {
  style: STYLES[store.get("style")] ? store.get("style") : "hightech",
  energy: 0.6,
  variety: 0.45,
  melody: 0.7,
  bpm: 124,
  volume: 0.75,
  evolve: true,
  journey: true,
  climate: CLIMATES[store.get("climate")] ? store.get("climate") : "shuffle",
  activeClimate: "night",
  scale: pick(SCALES),
  mix: [], // { text, weight, target, kind: "base" | "climate" | "palette" | "idea", role }
  palette: {}, // role → instrument tag for this journey
  session: null,
  connecting: false,
  playing: false,
  wantPlay: false,
};
for (const k of ["energy", "variety", "melody", "volume"]) {
  const v = store.get(k);
  if (v !== null) S[k] = clamp(+v);
}
S.bpm = +(store.get("bpm") || STYLES[S.style].bpm);
if (store.get("journey") === "0") S.journey = false;
const climateIds = Object.keys(CLIMATES).filter((id) => id !== "shuffle");
S.activeClimate = S.climate === "shuffle" ? pick(climateIds) : S.climate;
// bars counts the 16-bar sections; swap = the B variant of the arrangement; nudge = small energy change per section
const J = { phase: 0, t: 0, cycle: 1, bars: 0, swap: null, nudge: 0 };
const phase = () => PHASES[J.phase];
// the energy slider is the centre; the journey phase moves it up or down
function effEnergy() {
  if (!S.journey) return S.energy;
  const p = phase(),
    prev = PHASES[(J.phase + PHASES.length - 1) % PHASES.length].level;
  const level = p.ramp ? prev + (p.level - prev) * clamp(J.t / p.dur) : p.level;
  return clamp(S.energy + (level - 0.6) * 0.8 + J.nudge, 0.05, 1);
}

// ---------- audio out ----------
let ctx = null,
  out = null,
  analyser = null;
// target = seconds of audio we hold before we play; it grows after each gap
const A = {
  next: 0,
  started: false,
  pending: [],
  pendingSec: 0,
  target: 4,
  gaps: 0,
  why: {},
  rx: 0,
  t0: 0,
  lastReset: -1e9,
  lastConnect: -1e9,
};
function ensureAudio() {
  if (ctx) return;
  ctx = new AudioContext({ sampleRate: 48000, latencyHint: "playback" });
  out = ctx.createGain();
  out.gain.value = S.volume * S.volume;
  analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  out.connect(analyser);
  analyser.connect(ctx.destination);
  requestAnimationFrame(drawScope);
}
function enqueue(chunk) {
  if (!chunk?.data) return;
  const mt = chunk.mimeType || "";
  const rate = +(/rate=(\d+)/.exec(mt)?.[1] || 48000),
    ch = +(/channels=(\d+)/.exec(mt)?.[1] || 2);
  const bin = atob(chunk.data),
    u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const i16 = new Int16Array(u8.buffer, 0, u8.length >> 1);
  const frames = Math.floor(i16.length / ch);
  if (!frames) return;
  const buf = ctx.createBuffer(ch, frames, rate);
  for (let c = 0; c < ch; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < frames; i++) d[i] = i16[i * ch + c] / 32768;
  }
  A.pending.push(buf);
  A.pendingSec += buf.duration;
  if (S.playing) {
    A.rx += buf.duration;
    A.t0 ||= performance.now();
  }
  flush();
}
function flush() {
  if (!S.playing) return;
  const now = ctx.currentTime;
  if (A.next < now + 0.05) {
    if (A.started && !A.inGap) {
      // the buffer ran dry: record why, then hold more audio from now on
      const t = performance.now(),
        why = t - A.lastReset < 15000 ? "restart" : t - A.lastConnect < 15000 ? "reconnect" : "slow stream";
      A.inGap = true;
      A.gaps++;
      A.why[why] = (A.why[why] || 0) + 1;
      A.target = Math.min(10, A.target + 2);
      console.warn("[northlight-ai] gap", why, "speed", speed().toFixed(2));
    }
    if (A.pendingSec < A.target) {
      setStatus(A.started ? `Waiting for Google · ${A.pendingSec.toFixed(1)} of ${A.target} s` : "Buffering the first seconds…");
      renderHealth();
      return;
    }
    A.next = now + 0.1;
    A.started = true;
    A.inGap = false;
  }
  while (A.pending.length) {
    const b = A.pending.shift();
    A.pendingSec -= b.duration;
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.connect(out);
    src.start(A.next);
    A.next += b.duration;
  }
  setStatus(
    `Playing · ${STYLES[S.style].name} · ${CLIMATES[S.activeClimate].name} · ${S.journey ? phase().name + " · " : ""}${S.bpm} BPM · ${Math.max(0, A.next - now).toFixed(1)} s buffered`,
  );
}

const speed = () => (A.t0 ? A.rx / ((performance.now() - A.t0) / 1000) : 0);
function renderHealth() {
  const why = Object.entries(A.why)
    .map(([k, n]) => `${n}× ${k}`)
    .join(", ");
  $("#health").textContent =
    `Stream: ${A.t0 ? speed().toFixed(2) + "× real time" : "not started"} · ${A.gaps ? A.gaps + " gaps (" + why + ")" : "no gaps"} · buffer ${A.target} s`;
}

// ---------- session ----------
const config = () => ({
  bpm: S.bpm,
  scale: S.scale,
  density: +(0.1 + 0.8 * effEnergy()).toFixed(2),
  brightness: +(0.25 + 0.6 * effEnergy()).toFixed(2),
  temperature: +(1.0 + 1.0 * S.variety).toFixed(2),
  topK: Math.round(40 + 160 * S.variety), // more candidates per step = fewer loops
  guidance: 3.0, // lower than the default 4.0: smoother transitions
  muteDrums: S.journey && !!phase().noDrums,
});
const weighted = () => S.mix.filter((p) => p.weight > 0.05).map((p) => ({ text: p.text, weight: +p.weight.toFixed(1) }));
// send only when the rounded set changed, so the model can settle on what it plays
let sentKey = "",
  lastSend = 0;
async function sendPrompts(force = false) {
  const w = weighted(),
    key = JSON.stringify(w);
  if (S.session && (force || key !== sentKey)) {
    sentKey = key;
    lastSend = performance.now();
    S.sends = (S.sends || 0) + 1;
    try {
      await S.session.setWeightedPrompts({ weightedPrompts: w });
    } catch (e) {
      showErr(e);
    }
  }
  renderMix();
}
let sentEnergy = 0;
async function sendConfig(reset = false) {
  if (!S.session) return;
  sentEnergy = effEnergy();
  try {
    await S.session.setMusicGenerationConfig({ musicGenerationConfig: config() });
    if (reset) {
      S.session.resetContext();
      A.lastReset = performance.now();
    }
  } catch (e) {
    showErr(e);
  }
}

// a key kept only in memory ("Don't save"); it wins over a saved key
let sessionKey = null;
const getKey = () => sessionKey ?? store.get("key");
// never show or log the key, even when an error message carries it (for example inside a URL)
const redact = (text) => {
  const key = getKey();
  return key ? String(text).split(key).join("•••") : String(text);
};

async function connect() {
  const apiKey = getKey();
  if (!apiKey) {
    setStatus("Add your Gemini API key first.", true);
    return false;
  }
  S.connecting = true;
  A.lastConnect = performance.now();
  setStatus("Connecting to Lyria RealTime…");
  try {
    const ai = new GoogleGenAI({ apiKey, apiVersion: "v1beta" });
    S.session = await ai.live.music.connect({
      model: "models/lyria-realtime-exp",
      callbacks: {
        onmessage: (m) => {
          if (m.serverContent?.audioChunks) for (const c of m.serverContent.audioChunks) enqueue(c);
          if (m.filteredPrompt)
            setStatus(
              `Google filtered the prompt "${m.filteredPrompt.text}": ${m.filteredPrompt.filteredReason || "no reason given"}. Change or remove it.`,
              true,
            );
        },
        onerror: (e) => showErr(e.error || e),
        onclose: (e) => {
          S.session = null;
          console.warn("[northlight-ai] closed", e?.code, redact(e?.reason || ""));
          if (S.wantPlay) {
            setStatus(`Connection closed${e?.reason ? ": " + redact(e.reason) : ""}. Reconnecting…`, true);
            setTimeout(() => S.wantPlay && start(), 2000);
          }
        },
      },
    });
    await sendPrompts(true);
    await sendConfig();
    return true;
  } catch (e) {
    showErr(e);
    S.session = null;
    return false;
  } finally {
    S.connecting = false;
  }
}
async function start() {
  ensureAudio();
  await ctx.resume();
  S.wantPlay = true;
  if (!S.session && !(await connect())) {
    S.wantPlay = false;
    renderPlay();
    return;
  }
  S.session.play();
  S.playing = true;
  renderPlay();
  flush();
}
function pause() {
  S.wantPlay = false;
  S.playing = false;
  A.rx = 0;
  A.t0 = 0;
  if (S.session) S.session.pause();
  if (ctx) ctx.suspend();
  setStatus("Paused.");
  renderPlay();
}

// ---------- steering ----------
function loadStyle(id, { reset } = {}) {
  const st = STYLES[id];
  S.style = id;
  store.set("style", id);
  // fade the old base prompts out, the new ones in
  for (const p of S.mix) if (p.kind === "base") p.target = 0;
  for (const [text, w] of st.base) S.mix.push({ text, weight: 0.15, target: w, kind: "base" });
  renderStyles();
  if (reset) {
    S.bpm = st.bpm;
    store.set("bpm", S.bpm);
    renderControls();
    startOver({ sameClimate: true });
  } else renderMix();
}
// one row per kind (and role): fade the old text out, the new one in
function setRow(kind, text, target, role) {
  let hit = null;
  for (const p of S.mix)
    if (p.kind === kind && p.role === role) {
      if (p.text === text && !hit) {
        hit = p;
        p.target = target;
      } else p.target = 0;
    }
  if (!hit && text && target > 0) S.mix.push({ text, weight: 0.1, target, kind, role });
}
const pool = (role) => [...STYLES[S.style].kit[role], ...(role === "texture" ? TEXTURES : [])];
function pickPalette() {
  for (const r of ROLES) S.palette[r] = pick(pool(r));
}
// the phase decides which roles play; the Melody slider scales the lead and the featured instrument
function applyArrangement() {
  const m = { ...(S.journey ? phase().mix : FULL) };
  if (J.swap && m[J.swap.from] && !m[J.swap.to]) {
    m[J.swap.to] = m[J.swap.from];
    delete m[J.swap.from];
  }
  for (const r of ROLES) {
    let w = m[r] || 0;
    if (r === "lead" || r === "feature") w *= 0.3 + S.melody;
    setRow("palette", S.palette[r], +Math.min(1.2, w).toFixed(2), r);
  }
}
function enterPhase(i) {
  J.phase = i;
  J.t = 0;
  J.bars = 0;
  J.swap = null;
  J.nudge = 0;
  applyArrangement();
  // the breakdown has no drums, so it hides a hard reset: the second half gets a new key and fresh ideas
  if (S.journey && phase().noDrums) {
    S.scale = pick(SCALES.filter((s) => s !== S.scale));
    sendConfig(true);
  } else sendConfig();
  renderJourney();
  renderMix();
}
// every 16 bars something changes, as in a real track: a new instrument, or one part hands over to another
function sectionTurn() {
  const m = S.journey ? phase().mix : FULL;
  const active = ROLES.filter((r) => m[r]),
    idle = ROLES.filter((r) => !m[r] && !(phase().noDrums && (r === "drums" || r === "bass")));
  if (rnd() < 0.5 || !idle.length) {
    const r = pick(active.filter((r) => pool(r).length > 1));
    if (r) S.palette[r] = pick(pool(r).filter((t) => t !== S.palette[r]));
  } else {
    J.swap = J.swap ? null : { from: pick(active.filter((r) => r !== "drums")), to: pick(idle) };
  }
  J.nudge = (rnd() - 0.5) * 0.16;
  applyArrangement();
  sendConfig();
}
// a fresh journey: new key, new instruments, new climate on Shuffle, hard reset of the model
async function startOver({ sameClimate = false } = {}) {
  J.cycle++;
  J.phase = 0;
  J.t = 0;
  J.bars = 0;
  J.swap = null;
  J.nudge = 0;
  if (S.climate === "shuffle" && !sameClimate) S.activeClimate = pick(climateIds.filter((id) => id !== S.activeClimate));
  S.scale = pick(SCALES.filter((s) => s !== S.scale));
  pickPalette();
  setRow("climate", CLIMATES[S.activeClimate].text, 0.4);
  applyArrangement();
  for (const p of S.mix) p.weight = p.target;
  S.mix = S.mix.filter((p) => p.weight > 0.02);
  await sendPrompts(true);
  await sendConfig(true);
  renderClimates();
  renderJourney();
}
function journeyTick(dt) {
  J.t += dt;
  if (J.t >= phase().dur) {
    J.phase === PHASES.length - 1 ? startOver() : enterPhase(J.phase + 1);
    return;
  }
  if (phase().ramp && Math.abs(effEnergy() - sentEnergy) > 0.05) sendConfig();
  renderJourney();
}
let lastTick = performance.now();
function evolveTick() {
  const now = performance.now(),
    dt = (now - lastTick) / 1000;
  lastTick = now;
  if (S.journey && S.playing) journeyTick(dt);
  renderHealth();
  // move every weight a step toward its target, then drop rows that faded out
  for (const p of S.mix)
    if (Math.abs(p.weight - p.target) > 0.01) p.weight += Math.sign(p.target - p.weight) * Math.min(0.1, Math.abs(p.target - p.weight));
  S.mix = S.mix.filter((p) => !(p.target === 0 && p.weight <= 0.02));

  if (S.playing) {
    const before = Math.floor(J.bars / 16);
    J.bars += dt / (240 / S.bpm);
    if (S.evolve && Math.floor(J.bars / 16) > before) sectionTurn();
  }
  if (now - lastSend > 6000) sendPrompts();
  else renderMix();
}
setInterval(evolveTick, 2500);

// ---------- UI ----------
function setStatus(t, err = false) {
  const el = $("#status");
  el.textContent = t;
  el.classList.toggle("err", err);
}
function showErr(e) {
  const msg = redact(e?.message || String(e));
  console.error("[northlight-ai]", msg);
  setStatus("Error: " + msg, true);
}
function renderPlay() {
  $("#play").textContent = S.playing ? "Pause" : S.wantPlay ? "Connecting…" : "Play";
}
function renderStyles() {
  const box = $("#styles");
  if (!box.children.length) {
    for (const [id, st] of Object.entries(STYLES)) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.dataset.style = id;
      b.innerHTML = `${st.name}<small>${st.sub}</small>`;
      b.addEventListener("click", () => {
        if (id !== S.style) loadStyle(id, { reset: true });
      });
      box.appendChild(b);
    }
  }
  for (const b of box.children) b.setAttribute("aria-checked", String(b.dataset.style === S.style));
}
function renderClimates() {
  const box = $("#climates");
  if (!box.children.length) {
    for (const [id, c] of Object.entries(CLIMATES)) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.dataset.climate = id;
      b.innerHTML = `${c.name}<small>${c.sub}</small>`;
      b.addEventListener("click", () => {
        S.climate = id;
        store.set("climate", id);
        if (id !== "shuffle") {
          S.activeClimate = id;
          setRow("climate", c.text, 0.4);
        }
        renderClimates();
        renderJourney();
        renderMix();
      });
      box.appendChild(b);
    }
  }
  for (const b of box.children) b.setAttribute("aria-checked", String(b.dataset.climate === S.climate));
}
function renderJourney() {
  const box = $("#journey");
  if (!box.children.length)
    for (const p of PHASES) {
      const d = document.createElement("div");
      d.style.flex = String(p.dur);
      d.innerHTML = `<span>${p.name}</span><i><b></b></i>`;
      box.appendChild(d);
    }
  [...box.children].forEach((d, i) => {
    d.className = i < J.phase ? "done" : i === J.phase ? "on" : "";
    d.querySelector("b").style.width = i === J.phase ? `${Math.round(clamp(J.t / PHASES[i].dur) * 100)}%` : "";
  });
  box.classList.toggle("off", !S.journey);
  $("#jinfo").textContent = `Journey ${J.cycle} · ${CLIMATES[S.activeClimate].name} · key ${scaleName(S.scale)}`;
}
function renderMix() {
  const ul = $("#mix");
  ul.replaceChildren(
    ...S.mix.map((p) => {
      const li = document.createElement("li");
      const moving = Math.abs(p.weight - p.target) > 0.02;
      li.className = moving ? "auto" : "";
      const t = document.createElement("span");
      t.className = "t";
      t.textContent = p.text;
      const tag = document.createElement("small");
      tag.textContent =
        (p.kind === "palette" ? p.role : { base: "style", climate: "climate", idea: "your idea" }[p.kind]) +
        (moving ? (p.target > p.weight ? " · coming in" : " · going out") : "");
      t.appendChild(tag);
      const bar = document.createElement("span");
      bar.className = "bar";
      bar.innerHTML = `<i style="width:${Math.round(clamp(p.weight / 1.2) * 100)}%"></i>`;
      const x = document.createElement("button");
      x.type = "button";
      x.textContent = "×";
      x.title = "Remove";
      x.setAttribute("aria-label", "Remove " + p.text);
      x.addEventListener("click", () => {
        p.target = 0;
        renderMix();
      });
      li.append(t, bar, x);
      return li;
    }),
  );
}
function renderControls() {
  $("#energy").value = Math.round(S.energy * 100);
  $("#energyOut").textContent = S.energy < 0.3 ? "Calm" : S.energy < 0.7 ? "Steady" : "Driving";
  $("#variety").value = Math.round(S.variety * 100);
  $("#varietyOut").textContent = S.variety < 0.3 ? "Focused" : S.variety < 0.7 ? "Balanced" : "Wild";
  $("#melody").value = Math.round(S.melody * 100);
  $("#melodyOut").textContent = S.melody < 0.3 ? "Groove first" : S.melody < 0.7 ? "Melodic" : "Very melodic";
  $("#journeyOn").checked = S.journey;
  $("#bpm").value = S.bpm;
  $("#bpmOut").textContent = S.bpm + " BPM";
  $("#volume").value = Math.round(S.volume * 100);
  $("#volumeOut").textContent = Math.round(S.volume * 100);
}
let cfgTimer = 0;
const debouncedConfig = () => {
  clearTimeout(cfgTimer);
  cfgTimer = setTimeout(() => sendConfig(), 400);
};
$("#energy").addEventListener("input", (e) => {
  S.energy = e.target.value / 100;
  store.set("energy", S.energy);
  renderControls();
  debouncedConfig();
});
$("#variety").addEventListener("input", (e) => {
  S.variety = e.target.value / 100;
  store.set("variety", S.variety);
  renderControls();
  debouncedConfig();
});
$("#bpm").addEventListener("input", (e) => {
  S.bpm = +e.target.value;
  renderControls();
});
$("#bpm").addEventListener("change", () => {
  store.set("bpm", S.bpm);
  sendConfig(true);
});
$("#volume").addEventListener("input", (e) => {
  S.volume = e.target.value / 100;
  store.set("volume", S.volume);
  renderControls();
  if (out) out.gain.setTargetAtTime(S.volume * S.volume, ctx.currentTime, 0.1);
});
$("#melody").addEventListener("input", (e) => {
  S.melody = e.target.value / 100;
  store.set("melody", S.melody);
  applyArrangement();
  renderControls();
  renderMix();
});
$("#journeyOn").addEventListener("change", (e) => {
  S.journey = e.target.checked;
  store.set("journey", S.journey ? "1" : "0");
  enterPhase(J.phase);
});
$("#nextPhase").addEventListener("click", () => {
  if (!S.journey) {
    S.journey = true;
    store.set("journey", "1");
    renderControls();
  }
  J.phase === PHASES.length - 1 ? startOver() : enterPhase(J.phase + 1);
});
$("#startOver").addEventListener("click", () => startOver());
$("#evolve").addEventListener("change", (e) => {
  S.evolve = e.target.checked;
});
$("#play").addEventListener("click", () => (S.playing || S.wantPlay ? pause() : start()));
const addIdea = () => {
  const t = $("#idea").value.trim();
  if (!t) return;
  S.mix.push({ text: t, weight: 0.15, target: 1, kind: "idea" });
  $("#idea").value = "";
  renderMix();
};
$("#addIdea").addEventListener("click", addIdea);
$("#idea").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addIdea();
});
$("#saveKey").addEventListener("click", () => {
  const k = $("#key").value.trim();
  if (!k) return;
  if ($("#keySession").checked) {
    sessionKey = k;
    store.set("key", null);
  } else {
    sessionKey = null;
    store.set("key", k);
  }
  $("#key").value = "";
  $("#key").placeholder = sessionKey ? "Key kept for this tab only." : "Key saved in this browser.";
  setStatus(sessionKey ? "Key kept for this tab only. Press Play." : "Key saved. Press Play.");
});
$("#forgetKey").addEventListener("click", () => {
  sessionKey = null;
  store.set("key", null);
  $("#key").placeholder = "Paste your key. It stays in this browser.";
  setStatus("Key removed from this browser.");
});
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input[type=text], input[type=password]")) return;
  if (e.code === "Space" && !e.target.closest("button")) {
    e.preventDefault();
    $("#play").click();
  }
  if (e.code === "KeyN") $("#nextPhase").click();
});
if (store.get("key")) $("#key").placeholder = "Key saved in this browser.";

function drawScope() {
  const c = $("#scope"),
    g = c.getContext("2d"),
    dpr = devicePixelRatio || 1;
  const w = c.clientWidth,
    h = c.clientHeight;
  if (c.width !== w * dpr) {
    c.width = w * dpr;
    c.height = h * dpr;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  g.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent");
  g.lineWidth = 1.5;
  g.beginPath();
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / data.length) * w,
      y = h / 2 - data[i] * h * 0.45;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
  requestAnimationFrame(drawScope);
}

for (const [text, w] of STYLES[S.style].base) S.mix.push({ text, weight: w, target: w, kind: "base" });
S.mix.push({ text: CLIMATES[S.activeClimate].text, weight: 0.4, target: 0.4, kind: "climate" });
pickPalette();
applyArrangement();
for (const p of S.mix) p.weight = p.target;
renderStyles();
renderClimates();
renderJourney();
renderMix();
renderControls();
