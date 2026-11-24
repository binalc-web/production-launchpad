import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Standalone IIFE bundle for third-party sites (Marker-style loader loads this script).
export default defineConfig({
  publicDir: false,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_APP_IS_EMBED": JSON.stringify("true"),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    emptyOutDir: true,
    outDir: path.resolve(__dirname, "public/embed"),
    lib: {
      entry: path.resolve(__dirname, "src/embed/feedback-embed-main.jsx"),
      name: "LaunchpadFeedbackEmbed",
      formats: ["iife"],
      fileName: () => "feedback-embed.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: "feedback-embed[extname]",
      },
    },
  },
});
