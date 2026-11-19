/**
 * Serve a fake `@google/genai` module instead of the CDN one.
 * The fake records every session call in `window.__calls` and streams 0.5 s of silent PCM every 500 ms.
 * With `connectError`, `connect()` rejects with that message; "{key}" in it is replaced by the API key,
 * the way a real error can carry the WebSocket URL.
 */
export async function installFakeGenai(page, { connectError } = {}) {
  const body = `
export class GoogleGenAI {
  constructor({ apiKey }) { this.apiKey = apiKey; }
  get live() {
    const apiKey = this.apiKey;
    return { music: { connect: async ({ callbacks }) => {
      const calls = (window.__calls ||= []);
      calls.push(["connect"]);
      ${connectError ? `throw new Error(${JSON.stringify(connectError)}.replace("{key}", apiKey));` : ""}
      const bytes = new Uint8Array(48000 * 2 * 2 * 0.5);
      let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
      const data = btoa(bin);
      setInterval(() => callbacks.onmessage({ serverContent: { audioChunks: [{ data, mimeType: "audio/l16;rate=48000;channels=2" }] } }), 500);
      return {
        setWeightedPrompts: async (x) => calls.push(["prompts", x.weightedPrompts]),
        setMusicGenerationConfig: async (x) => calls.push(["config", x.musicGenerationConfig]),
        play: () => calls.push(["play"]), pause: () => calls.push(["pause"]), resetContext: () => calls.push(["reset"]),
      };
    } } };
  }
}`;
  await page.route("**/@google/genai@2.27.0/+esm", (route) =>
    route.fulfill({ contentType: "text/javascript", headers: { "Access-Control-Allow-Origin": "*" }, body }),
  );
}

export const calls = (page) => page.evaluate(() => (window.__calls || []).map((c) => c[0]));
