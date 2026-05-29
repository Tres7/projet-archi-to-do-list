FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY common/package.json ./common/package.json
COPY apps/task-service/package.json ./apps/task-service/package.json

RUN npm ci --workspace @app/common --workspace @app/task-service --include-workspace-root

FROM deps AS builder
COPY tsconfig.base.json ./
COPY common ./common
COPY types ./types
COPY apps/task-service ./apps/task-service

RUN npm run build --workspace @app/common
RUN npm run build --workspace @app/task-service

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY common/package.json ./common/package.json
COPY apps/task-service/package.json ./apps/task-service/package.json

RUN npm ci --omit=dev --workspace @app/common --workspace @app/task-service

COPY --from=builder /app/common/dist ./common/dist
COPY --from=builder /app/apps/task-service/dist ./apps/task-service/dist

EXPOSE 3003
USER node
CMD ["node", "apps/task-service/dist/index.js"]
