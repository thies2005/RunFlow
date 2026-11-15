# syntax=docker/dockerfile:1

# ==================================
# Stage 1: Builder
# ==================================
FROM node:24-alpine AS builder
# M-11 fix: Pin node version for reproducible builds

# Install required packages and patch base image packages
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies with cache and memory limit
COPY package.json package-lock.json* ./
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

# Prisma generate needs DATABASE_URL in prisma.config.ts but doesn't connect.
# Dummy default is fine; the real URL is provided at runtime by the container env.
ARG DATABASE_URL=postgresql://localhost:5432/dummy
ENV DATABASE_URL=$DATABASE_URL
ENV CHECKPOINT_DISABLE=1

# Copy Prisma schema and config before full source tree so Prisma generation is cached across code edits
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN npx prisma generate

# Stage Prisma CLI and its transitive runtime dependencies for migrator in runner
RUN node -e ' \
  const fs = require("fs"), path = require("path"); \
  const src = "/app/node_modules", dst = "/tmp/prisma-deps/node_modules"; \
  const seen = new Set(), q = ["prisma", "dotenv"]; \
  while (q.length) { \
    const pkg = q.shift(); \
    if (seen.has(pkg)) continue; \
    seen.add(pkg); \
    const p = path.join(src, pkg); \
    if (!fs.existsSync(p)) continue; \
    fs.cpSync(p, path.join(dst, pkg), { recursive: true }); \
    const pj = JSON.parse(fs.readFileSync(path.join(p, "package.json"), "utf8")); \
    for (const d of Object.keys(pj.dependencies || {})) if (!seen.has(d)) q.push(d); \
  }'

# Build-time public variables (declared after dependency & Prisma layers to preserve cache)
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ARG HOSTNAME
ARG PORT
ARG REDIS_URL

COPY . .

# Build Next.js with cache and memory limit (skip redundant lint/typecheck already run in CI)
ENV NEXT_TELEMETRY_DISABLED=1
ENV SENTRY_DISABLE_SOURCEMAP_UPLOAD=1
ENV NEXT_SKIP_TYPECHECK=1
ENV NODE_OPTIONS="--max-old-space-size=6144"

RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ==================================
# Stage 2: Runner
# ==================================
FROM node:24-alpine AS runner
RUN apk upgrade --no-cache && apk add --no-cache openssl libc6-compat wget curl postgresql16-client \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV CHECKPOINT_DISABLE=1
ENV JITI_CACHE_DIR=/tmp/jiti
# M-13 fix: Remove NODE_OPTIONS in runner to allow proper memory management
ENV NODE_OPTIONS=""

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /tmp/prisma-deps/node_modules ./node_modules

# Declare build-time ARGs at end of runner stage so Coolify does not inject them after FROM
ARG DATABASE_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_APP_URL
ARG HOSTNAME
ARG PORT
ARG REDIS_URL

# Create backups directory and set permissions
RUN mkdir -p /app/backups && chown nextjs:nodejs /app/backups

# Create .next/cache directory for Next.js image optimizer
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next/cache

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check - verify app is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --start-interval=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider --method=HEAD http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
