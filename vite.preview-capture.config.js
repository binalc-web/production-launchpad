import path from "path";
import { defineConfig } from "vite";

// Full-page capture script the preview bridge loads into cross-origin subdomain previews.
// Runs after vite.embed.config.js, which empties public/embed.
export default defineConfig({
  publicDir: false,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    emptyOutDir: false,
    outDir: path.resolve(__dirname, "public/embed"),
    lib: {
      entry: path.resolve(__dirname, "src/embed/preview-capture-main.js"),
      name: "LaunchpadPreviewCapture",
      formats: ["iife"],
      fileName: () => "preview-capture.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
