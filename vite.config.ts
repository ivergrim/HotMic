import { defineConfig } from "vite";

// wrangler.jsonc serves static assets from ./dist — do not change this output dir.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
});
