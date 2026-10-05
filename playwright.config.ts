import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:4173/Capacity-Building-Commission/",
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.BROWSER_EXECUTABLE },
  },
  webServer: {
    command:
      "BASE_PATH=/Capacity-Building-Commission/ npm run build && BASE_PATH=/Capacity-Building-Commission/ npm run preview -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/Capacity-Building-Commission/",
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
