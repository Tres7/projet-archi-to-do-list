FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY common/package.json ./common/package.json
COPY apps/notification-service/package.json ./apps/notification-service/package.json

RUN npm ci --workspace @app/common --workspace @app/notification-service --include-workspace-root

FROM deps AS builder
COPY tsconfig.base.json ./
COPY common ./common
COPY types ./types
COPY apps/notification-service ./apps/notification-service

RUN npm run build --workspace @app/common
RUN npm run build --workspace @app/notification-service

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY common/package.json ./common/package.json
COPY apps/notification-service/package.json ./apps/notification-service/package.json

RUN npm ci --omit=dev --workspace @app/common --workspace @app/notification-service

COPY --from=builder /app/common/dist ./common/dist
COPY --from=builder /app/apps/notification-service/dist ./apps/notification-service/dist

EXPOSE 3004
CMD ["npm", "run", "start", "--workspace", "@app/notification-service"]
