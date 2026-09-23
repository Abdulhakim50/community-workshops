import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const port = process.env.CI ? 3001 : 3000;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 30_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Local Windows development can use the installed Chrome channel;
        // CI installs Playwright's pinned Chromium build for reproducibility.
        channel: process.env.CI ? undefined : "chrome",
      },
    },
  ],
  webServer: {
    command: process.env.CI
      ? `npm run start -- -p ${port}`
      : `npm run dev -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      BETTER_AUTH_URL: baseURL,
      APP_URL: baseURL,
      RESEND_API_KEY: "",
      EMAIL_FROM: "",
    },
  },
});
