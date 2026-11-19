import { test, expect } from "@playwright/test";
import { collectErrors } from "./errors.js";
import { installFakeGenai } from "./fake-genai.js";

const PAGES = ["/", "/ai.html"];

// Record CSP violations from the first script on.
async function watchViolations(page) {
  await page.addInitScript(() => {
    window.__violations = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__violations.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  return () => page.evaluate(() => window.__violations);
}

async function play(page, path) {
  await page.goto(path);
  if (path === "/ai.html") {
    await page.fill("#key", "test-key-123");
    await page.click("#saveKey");
  }
  await page.click("#play");
  await page.waitForTimeout(3000);
}

for (const path of PAGES) {
  test(`blocks unknown hosts ${path}`, async ({ page }) => {
    const violations = await watchViolations(page);
    await page.goto(path);
    const result = await page.evaluate(() =>
      fetch("https://example.com").then(
        () => "ok",
        () => "blocked",
      ),
    );
    expect(result).toBe("blocked");
    expect((await violations()).join()).toContain("example.com");
  });

  test(`no violations on load ${path}`, async ({ page }) => {
    await installFakeGenai(page);
    const violations = await watchViolations(page);
    const errors = collectErrors(page);
    await play(page, path);
    expect(await violations()).toEqual([]);
    expect(errors).toEqual([]);
  });
}

// The real @google/genai module from jsDelivr must load under the CSP: no eval, no other host.
test("real genai module loads under the CSP", async ({ page }) => {
  const violations = await watchViolations(page);
  const errors = collectErrors(page);
  await page.goto("/ai.html");
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.querySelectorAll("#styles button").length)).toBeGreaterThan(0);
  expect(await violations()).toEqual([]);
  expect(errors).toEqual([]);
});
