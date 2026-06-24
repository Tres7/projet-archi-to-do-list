FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY common/package.json ./common/package.json
COPY apps/auth-service/package.json ./apps/auth-service/package.json

RUN npm ci --workspace @app/common --workspace @app/auth-service --include-workspace-root

FROM deps AS builder
COPY tsconfig.base.json ./
COPY common ./common
COPY types ./types
COPY apps/auth-service ./apps/auth-service

RUN npm run build --workspace @app/common && npm run build --workspace @app/auth-service

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY common/package.json ./common/package.json
COPY apps/auth-service/package.json ./apps/auth-service/package.json

RUN npm ci --omit=dev --workspace @app/common --workspace @app/auth-service \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --from=builder /app/common/dist ./common/dist
COPY --from=builder /app/apps/auth-service/dist ./apps/auth-service/dist

EXPOSE 3001
USER node
CMD ["node", "apps/auth-service/dist/index.js"]
