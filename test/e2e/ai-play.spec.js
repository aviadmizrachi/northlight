import { test, expect } from "./fixtures.js";
import { installFakeGenai, calls } from "./fake-genai.js";

test("plays with fake lyria", async ({ page }) => {
  await installFakeGenai(page);
  await page.goto("/ai.html");
  await page.fill("#key", "test-key-123");
  await page.click("#saveKey");
  await page.click("#play");
  await page.waitForTimeout(6000);
  const seen = await calls(page);
  for (const c of ["prompts", "config", "play"]) expect(seen).toContain(c);
  await expect(page.locator("#health")).toContainText("real time");
});

test.describe("phone width", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const path of ["/", "/ai.html"]) {
    test(path, async ({ page }) => {
      await installFakeGenai(page);
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    });
  }
});
