FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# v10.20.11: NEXT_PUBLIC_* is baked at BUILD time, but .dockerignore excludes
# .env* (secret hygiene) — so runtime env_file can't feed these. Pass the few
# public build-time flags explicitly via build args (wired in docker-compose).
ARG NEXT_PUBLIC_VIDEO_PREROLL_ENABLED=false
ENV NEXT_PUBLIC_VIDEO_PREROLL_ENABLED=$NEXT_PUBLIC_VIDEO_PREROLL_ENABLED
ARG NEXT_PUBLIC_DSP_PREROLL_AD_TAG=
ENV NEXT_PUBLIC_DSP_PREROLL_AD_TAG=$NEXT_PUBLIC_DSP_PREROLL_AD_TAG
# Which ad stack the build ships (vox | prebid | both). Must be a build arg for
# the same reason as above: the server reads it at runtime from env_file, but
# the client bundle only gets what is inlined here. A mismatch renders the ad
# slots server-side and then drops them on hydration.
ARG NEXT_PUBLIC_ADS_PROVIDER=vox
ENV NEXT_PUBLIC_ADS_PROVIDER=$NEXT_PUBLIC_ADS_PROVIDER
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4200
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# v10.20.0: drop root.
# `node` user (uid=1000) ships with node:20-bookworm-slim. Make /app writeable
# for it (Next.js needs .next/cache writeable for ISR) and ensure runtime-logs/
# exists so the volume mount lands on a real directory.
RUN mkdir -p /app/runtime-logs \
  && chown -R node:node /app
USER node

EXPOSE 4200

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4200/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start", "--", "-p", "4200"]

