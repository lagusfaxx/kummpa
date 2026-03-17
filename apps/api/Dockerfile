FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci --include=dev

FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run db:generate
RUN npm run build --workspace @kumpa/api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV PRISMA_MIGRATE_ON_START=true
ENV PRISMA_MIGRATE_MAX_ATTEMPTS=10
ENV PRISMA_MIGRATE_DELAY_SECONDS=5

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

CMD ["sh", "apps/api/docker-entrypoint.sh"]
