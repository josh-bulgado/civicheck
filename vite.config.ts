import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { devtools } from "@tanstack/devtools-vite";

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
    // Router route splits and the renderer must share React's hook dispatcher,
    // including when pnpm resolves dependencies through different real paths.
    dedupe: ["react", "react-dom"],
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact(), nitro({
    // TanStack server functions share Nitro's Vercel function, including login
    // and reset. Leave room for bounded waitUntil email delivery after response.
    vercel: { functions: { maxDuration: 60 } },
  })],
});
