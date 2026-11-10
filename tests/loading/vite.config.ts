import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
  cacheDir: fileURLToPath(new URL("../../artifacts/loading/vite-cache", import.meta.url)),
  resolve: {
    alias: { "~": fileURLToPath(new URL("../../src", import.meta.url)) },
    dedupe: ["react", "react-dom"],
  },
  server: { fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] } },
  plugins: [tailwindcss(), react()],
});
