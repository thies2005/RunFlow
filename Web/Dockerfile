# syntax=docker/dockerfile:1

# ==================================
# Stage 1: Dependencies
# ==================================
# M-11 fix: Pin node version for reproducible builds
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies with cache
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ==================================
# Stage 2: Builder
# ==================================
FROM node:24-alpine AS builder
# M-10 fix: Add build arg for Sentry DSN (needed at build time for client-side code)
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

# Prisma generate needs DATABASE_URL in prisma.config.ts but doesn't connect.
# Dummy default is fine; the real URL is provided at runtime by the container env.
ARG DATABASE_URL=postgresql://localhost:5432/dummy
ENV DATABASE_URL=$DATABASE_URL

RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (cached across builds when schema unchanged)
RUN --mount=type=cache,target=/app/src/generated \
    npx prisma generate

# Build Next.js with cache and memory limit
ENV NEXT_TELEMETRY_DISABLED=1
ENV SENTRY_DISABLE_SOURCEMAP_UPLOAD=1
ENV NODE_OPTIONS="--max-old-space-size=6144"

RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ==================================
# Stage 3: Runner
# ==================================
FROM node:24-alpine AS runner
RUN apk add --no-cache openssl libc6-compat wget curl postgresql16-client
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
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
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
