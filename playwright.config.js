import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "test/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    ...devices["Desktop Chrome"],
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
  },
  webServer: { command: "npm run serve", url: "http://localhost:4173", reuseExistingServer: !process.env.CI },
});
