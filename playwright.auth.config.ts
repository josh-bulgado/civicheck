import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/auth",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: `${process.platform === "win32" ? "pnpm.cmd" : "pnpm"} dev --host 127.0.0.1`,
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
