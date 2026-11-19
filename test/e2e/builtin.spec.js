/* global Tone */
import { test, expect } from "./fixtures.js";
import { collectErrors } from "./errors.js";

test("plays", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await page.click("#play");
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => Tone.context.state)).toBe("running");
  expect(errors).toEqual([]);
});

test("cdn down", async ({ page }) => {
  await page.route("**/tone/14.8.49/Tone.js", (r) => r.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("could not load");
});

test("no inline code", async ({ request }) => {
  for (const path of ["/", "/ai.html"]) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toContain("<style");
    const bodies = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1].trim()).filter(Boolean);
    expect(bodies, path).toEqual([]);
  }
});
