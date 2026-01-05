# ==================================
# Stage 1: Dependencies
# ==================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# ==================================
# Stage 2: Builder
# ==================================
# ==================================
# Stage 2: Builder
# ==================================
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ==================================
# Stage 3: Runner
# ==================================
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
