import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: ".",
  workers: 1,
  reporter: "list",
  outputDir: "../../artifacts/loading/results",
  use: {
    baseURL: "http://127.0.0.1:3109",
    channel: "chrome",
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js --config "${fileURLToPath(new URL("./vite.config.ts", import.meta.url))}" --host 127.0.0.1 --port 3109 --strictPort`,
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    url: "http://127.0.0.1:3109",
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
  },
});
