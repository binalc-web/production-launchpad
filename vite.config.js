import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import {
  attachEmbeddedUpgrade,
  createEmbeddedProxyMiddleware,
} from "./iframe-preview/middleware.js";
import { resolveEmbedUpstreamOptionsFromEnv } from "./iframe-preview/embedUpstream.js";

let embedProxyReadyLogged = false;

function attachEmbeddedProxy(server) {
  const embeddedProxy = createEmbeddedProxyMiddleware(resolveEmbedUpstreamOptionsFromEnv());
  // Root orphan assets first (referer/cookie → port), then /embedded/<port>/…
  server.middlewares.use(embeddedProxy);
  attachEmbeddedUpgrade(server.httpServer, embeddedProxy);
  if (!embedProxyReadyLogged) {
    embedProxyReadyLogged = true;
    // eslint-disable-next-line no-console -- single embed proxy ready signal
    console.log("[embed] preview proxy ready — /embedded/<port>/");
  }
}

function embeddedProxyPlugin() {
  return {
    name: "launchpad-embedded-proxy",
    enforce: "pre",
    configureServer(server) {
      attachEmbeddedProxy(server);
    },
    configurePreviewServer(server) {
      attachEmbeddedProxy(server);
    },
  };
}

export default defineConfig({
  server: {
    port: 5173,
    allowedHosts: [".localhost", "localhost", "127.0.0.1", "backend", "host.docker.internal"],
  },
  preview: {
    port: 5173,
    allowedHosts: [".localhost", "localhost", "127.0.0.1", "backend", "host.docker.internal"],
  },
  plugins: [react(), tailwindcss(), embeddedProxyPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Isolate mermaid (heavy transitive graph) to lower peak memory during Docker builds.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("mermaid")) return "mermaid";
          if (
            id.includes("cytoscape") ||
            id.includes("elkjs") ||
            id.includes("/elk.") ||
            id.includes("katex")
          ) {
            return "mermaid-vendor";
          }
          return undefined;
        },
      },
    },
  },
});
