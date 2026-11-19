import { test as base, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

// Serve the pinned Tone.js from node_modules, so tests do not depend on the CDN.
const tone = readFileSync(new URL("../../node_modules/tone/build/Tone.js", import.meta.url), "utf8");

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("**/ajax/libs/tone/14.8.49/Tone.js", (route) =>
      route.fulfill({ contentType: "text/javascript", headers: { "Access-Control-Allow-Origin": "*" }, body: tone }),
    );
    await use(page);
  },
});
export { expect };
