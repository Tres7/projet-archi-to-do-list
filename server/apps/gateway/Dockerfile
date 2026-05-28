FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY common/package.json ./common/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json

RUN npm ci --workspace @app/gateway --include-workspace-root

FROM deps AS builder
COPY tsconfig.base.json ./
COPY apps/gateway ./apps/gateway

RUN npm run build --workspace @app/gateway

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY common/package.json ./common/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json

RUN npm ci --omit=dev --workspace @app/gateway

COPY --from=builder /app/apps/gateway/dist ./apps/gateway/dist

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@app/gateway"]
