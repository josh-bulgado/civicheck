import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: ".",
  workers: 1,
  reporter: "list",
  outputDir: "../../artifacts/mobile-dialogs/results",
  use: {
    baseURL: "http://127.0.0.1:3112",
    channel: "chrome",
    reducedMotion: "reduce",
    viewport: { width: 393, height: 780 },
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js --config "${fileURLToPath(new URL("./vite.config.ts", import.meta.url))}" --host 127.0.0.1 --port 3112 --strictPort`,
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    url: "http://127.0.0.1:3112",
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
  },
});
