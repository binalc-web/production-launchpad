# syntax=docker/dockerfile:1
# Frontend - Vite build → tiny Node static+embed server (no full app node_modules in runtime)
# Build context must be repo root (.)
FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_URL=http://15.206.209.185:5000
ARG VITE_FRONTEND_URL=http://15.206.209.185:5173

ARG VITE_MODE=production
ARG VITE_SENTRY_DSN=
ARG VITE_SENTRY_ENVIRONMENT=
ARG VITE_SENTRY_TRACES_SAMPLE_RATE=
ARG VITE_HUB_API_URL=
ARG VITE_HUB_OAUTH_REDIRECT_URL=
ARG VITE_HUB_PROFILE_PIC_API_KEY=
ARG FIGMA_PLUGIN_DOWNLOAD_URL=https://yorkie-launchpad.s3.us-east-1.amazonaws.com/Launchpad.zip

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_MODE=$VITE_MODE
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT
ENV VITE_SENTRY_TRACES_SAMPLE_RATE=$VITE_SENTRY_TRACES_SAMPLE_RATE
ENV VITE_HUB_API_URL=$VITE_HUB_API_URL
ENV VITE_HUB_OAUTH_REDIRECT_URL=$VITE_HUB_OAUTH_REDIRECT_URL
ENV VITE_HUB_PROFILE_PIC_API_KEY=$VITE_HUB_PROFILE_PIC_API_KEY
ENV VITE_FIGMA_PLUGIN_DOWNLOAD_URL=$FIGMA_PLUGIN_DOWNLOAD_URL

ENV NPM_CONFIG_FETCH_RETRIES=8
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
# Mermaid + large app graph can exceed default ~2GB heap during vite build in Docker.
ENV NODE_OPTIONS=--max-old-space-size=4096

COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked set -e; \
    for attempt in 1 2 3; do \
      echo "npm ci attempt ${attempt}/3..."; \
      npm ci --no-audit --no-fund --ignore-scripts && break; \
      if [ "$attempt" -eq 3 ]; then exit 1; fi; \
      echo "npm ci failed, retrying in $((attempt * 15))s..." >&2; \
      sleep $((attempt * 15)); \
    done

# Embed proxy imports ../../shared/preview-rewrite from iframe-preview/
COPY shared /shared
COPY frontend/ .
RUN set -e; \
    for attempt in 1 2 3; do \
      echo "ensure-native-deps attempt ${attempt}/3..."; \
      node scripts/ensure-native-deps.mjs && break; \
      if [ "$attempt" -eq 3 ]; then exit 1; fi; \
      echo "ensure-native-deps failed, retrying in $((attempt * 15))s..." >&2; \
      sleep $((attempt * 15)); \
    done
# Vite cache mount keeps incremental rebuilds fast across deploy runs.
RUN --mount=type=cache,target=/app/node_modules/.vite,sharing=locked \
    npm run build

# Runtime needs only express + http-proxy-middleware (SPA is already in dist/).
# Writing a slim package.json avoids shipping ~700MB of React/Vite/Mermaid deps twice.
RUN node --input-type=commonjs -e 'const p=require("./package.json");require("fs").writeFileSync("package.runtime.json",JSON.stringify({name:p.name,private:true,type:"module",dependencies:{"express":p.dependencies.express,"http-proxy-middleware":p.dependencies["http-proxy-middleware"]}},null,2))'

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NPM_CONFIG_FETCH_RETRIES=8
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

COPY --from=build /app/package.runtime.json ./package.json
RUN --mount=type=cache,target=/root/.npm,sharing=locked set -e; \
    for attempt in 1 2 3; do \
      echo "runtime npm install attempt ${attempt}/3..."; \
      npm install --omit=dev --no-audit --no-fund --ignore-scripts && break; \
      if [ "$attempt" -eq 3 ]; then exit 1; fi; \
      echo "runtime npm install failed, retrying in $((attempt * 15))s..." >&2; \
      sleep $((attempt * 15)); \
    done

COPY --from=build /app/dist ./dist
COPY --from=build /app/docker-serve.mjs ./docker-serve.mjs
COPY --from=build /app/iframe-preview ./iframe-preview
COPY --from=build /shared /shared

ENV PORT=80
EXPOSE 80
# ulimit is inherited by the server. Compose also sets the container core rlimit to 0.
CMD ["sh", "-c", "ulimit -c 0; exec node docker-serve.mjs"]
