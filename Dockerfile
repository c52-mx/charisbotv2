# ── CharisBot Portal · Dockerfile ──────────────────────────────
# Coloca este archivo en la RAÍZ del repo (junto a package.json)
# ---------------------------------------------------------------

# Stage 1: dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# Stage 2: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Variables NEXT_PUBLIC_* deben declararse como ARG para que
# Dokploy/Docker las inyecte en el bundle de Next.js en tiempo de build
ARG NEXT_PUBLIC_HCAPTCHA_SITEKEY
ENV NEXT_PUBLIC_HCAPTCHA_SITEKEY=$NEXT_PUBLIC_HCAPTCHA_SITEKEY
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

RUN npm run build

# Stage 3: runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
