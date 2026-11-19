import { test, expect } from "./fixtures.js";
import { collectErrors } from "./errors.js";
import { installFakeGenai, calls } from "./fake-genai.js";

const TRUST =
  'Your key stays in this browser. This page has no server. It sends your key only to Google, straight from your browser. The code is public: read it on GitHub. Use "Forget key" to delete it.';
const stored = (page) => page.evaluate(() => localStorage.getItem("northlight-ai.key"));

async function saveKey(page, key, { session = false } = {}) {
  if (session) await page.check("#keySession");
  await page.fill("#key", key);
  await page.click("#saveKey");
}

test.beforeEach(async ({ page }) => {
  await installFakeGenai(page);
});

test("trust text", async ({ page }) => {
  await page.goto("/ai.html");
  await expect(page.locator(".trust")).toHaveText(TRUST);
  await expect(page.locator('.trust a[href="https://github.com/aviadmizrachi/northlight"]')).toHaveCount(1);
});

test("save", async ({ page }) => {
  await page.goto("/ai.html");
  await saveKey(page, "test-key-123");
  expect(await stored(page)).toBe("test-key-123");
  await expect(page.locator("#key")).toHaveValue("");
});

test("session only", async ({ page }) => {
  await page.goto("/ai.html");
  await saveKey(page, "test-key-123", { session: true });
  expect(await stored(page)).toBeNull();
  await page.click("#play");
  await expect.poll(() => calls(page)).toContain("play");
});

test("forget", async ({ page }) => {
  await page.goto("/ai.html");
  await saveKey(page, "test-key-123", { session: true });
  await page.click("#forgetKey");
  await page.click("#play");
  await expect(page.locator("#status")).toContainText("Add your Gemini API key first.");
  expect(await calls(page)).not.toContain("connect");
});

test("no key → no network", async ({ page }) => {
  const google = [];
  page.on("request", (r) => r.url().includes("googleapis.com") && google.push(r.url()));
  await page.goto("/ai.html");
  await page.click("#play");
  await expect(page.locator("#status")).toContainText("Add your Gemini API key");
  expect(google).toEqual([]);
  expect(await calls(page)).not.toContain("connect");
});

test("bad key is not echoed", async ({ page }) => {
  await installFakeGenai(page, { connectError: "API key not valid: wss://generativelanguage.googleapis.com/ws?key={key}" });
  const logs = [];
  page.on("console", (m) => logs.push(m.text()));
  await page.goto("/ai.html");
  await saveKey(page, "bad-key-xyz");
  await page.click("#play");
  await expect(page.locator("#status")).toContainText("API key not valid");
  expect(await page.evaluate(() => document.body.innerText)).not.toContain("bad-key-xyz");
  expect(logs.join("\n")).not.toContain("bad-key-xyz");
});

test("storage throws", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  const errors = collectErrors(page);
  await page.goto("/ai.html");
  await saveKey(page, "test-key-123", { session: true });
  await page.click("#play");
  await expect.poll(() => calls(page)).toContain("play");
  expect(errors).toEqual([]);
});

test("forget closes the open session", async ({ page }) => {
  await page.goto("/ai.html");
  await saveKey(page, "test-key-123");
  await page.click("#play");
  await expect.poll(() => calls(page)).toContain("play");
  await page.click("#forgetKey");
  expect(await calls(page)).toContain("close");
  await expect(page.locator("#status")).toContainText("Key removed");
  await expect(page.locator("#play")).toHaveText("Play");
});

test("google library down", async ({ page }) => {
  await page.route("**/@google/genai@2.27.0/+esm", (r) => r.abort());
  await page.goto("/ai.html");
  await expect(page.locator("#styles button").first()).toBeVisible();
  await saveKey(page, "test-key-123");
  await page.click("#play");
  await expect(page.locator("#status")).toContainText("could not load");
});
