FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY common/package.json ./common/package.json
COPY apps/project-service/package.json ./apps/project-service/package.json

RUN npm ci --workspace @app/common --workspace @app/project-service --include-workspace-root

FROM deps AS builder
COPY tsconfig.base.json ./
COPY common ./common
COPY types ./types
COPY apps/project-service ./apps/project-service

RUN npm run build --workspace @app/common
RUN npm run build --workspace @app/project-service

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY common/package.json ./common/package.json
COPY apps/project-service/package.json ./apps/project-service/package.json

RUN npm ci --omit=dev --workspace @app/common --workspace @app/project-service

COPY --from=builder /app/common/dist ./common/dist
COPY --from=builder /app/apps/project-service/dist ./apps/project-service/dist

EXPOSE 3002
CMD ["npm", "run", "start", "--workspace", "@app/project-service"]
