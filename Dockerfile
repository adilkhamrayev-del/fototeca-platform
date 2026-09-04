# Multi-stage build producing a minimal runtime image from Next.js's
# `output: "standalone"` build (see next.config.ts) — the pattern from
# Next's own Docker example, adapted for this project.
#
# Uses debian-slim (glibc), not alpine: sharp's native binary has known
# extra-configuration issues on musl/alpine (see the self-hosting docs'
# Image Optimization note). node:22 matches the --experimental-strip-types
# flag scripts/*.ts relies on.

FROM node:22-bookworm-slim AS base

# ---- deps: install once, cached as long as package*.json don't change ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: needs real internet access for Google Fonts (Outfit, DM
# Sans, fetched at build time by next/font/google) — unlike the Claude
# sandbox this was developed in, a normal server has this. ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: only the standalone output + static assets, nothing else ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/db ./db
COPY --from=builder /app/scripts ./scripts
# scripts/seed.ts and scripts/migrate-legacy-orders.ts import from ../src/lib
# directly (as plain .ts, run via --experimental-strip-types) — the pruned
# standalone node_modules already has `pg`, so this is the only extra
# source needed to run them inside the image (e.g. `docker compose exec app
# npm run db:seed`).
COPY --from=builder /app/src/lib ./src/lib

COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x docker/entrypoint.sh

# storage/ holds uploaded order photos (see src/app/api/upload/route.ts) —
# created here so it exists even before the first upload; the compose file
# mounts a volume over it so uploads survive container restarts.
RUN mkdir -p storage/orders && chown -R nextjs:nodejs storage

USER nextjs
EXPOSE 3000

ENTRYPOINT ["docker/entrypoint.sh"]
