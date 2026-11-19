import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
  cacheDir: fileURLToPath(new URL("../../artifacts/mobile-dialogs/vite-cache", import.meta.url)),
  resolve: {
    alias: {
      "../account.mutations": fileURLToPath(new URL("./profile-mocks.ts", import.meta.url)),
      "../hooks/useAvatar": fileURLToPath(new URL("./profile-mocks.ts", import.meta.url)),
      "~/features/search/search.queries": fileURLToPath(new URL("./profile-mocks.ts", import.meta.url)),
      "~/features/notifications/notifications.queries": fileURLToPath(new URL("./notification-mocks.ts", import.meta.url)),
      "~/features/notifications/notifications.mutations": fileURLToPath(new URL("./notification-mocks.ts", import.meta.url)),
      "~/features/apply/apply.mutations": fileURLToPath(new URL("./upload-mutations.ts", import.meta.url)),
      "~/features/services/services.mutations": fileURLToPath(new URL("./submission-mutations.ts", import.meta.url)),
      "~": fileURLToPath(new URL("../../src", import.meta.url)),
    },
    dedupe: ["react", "react-dom"],
  },
  server: { fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] } },
  plugins: [tailwindcss(), react()],
});
