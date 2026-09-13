import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5180", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "webkit",
      use: { ...devices["iPhone 13"], defaultBrowserType: "webkit" },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 5180",
    url: "http://127.0.0.1:5180",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-only-key",
    },
  },
});
