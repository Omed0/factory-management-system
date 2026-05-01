# syntax=docker/dockerfile:1.7
# Multi-stage build for the TanStack Start app (node-server preset).
# Build:   docker build -t fms-app:latest .
# Run:     docker run --env-file .env -p 3000:3000 fms-app:latest

FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun \
    bun install --frozen-lockfile

FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# Both VITE_* vars are baked into the browser bundle at build time.
# Pass them via --build-arg so the browser Supabase client works in production.
# Example:
#   docker build \
#     --build-arg VITE_SUPABASE_URL=https://api.your-domain.com \
#     --build-arg VITE_SUPABASE_ANON_KEY=eyJ... \
#     -t fms-app:latest .
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN bun run build

FROM oven/bun:1-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S app && adduser -S app -u 1001 -G app
COPY --from=build --chown=app:app /app/.output ./.output
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:3000/healthz || exit 1
CMD ["bun", ".output/server/index.mjs"]
