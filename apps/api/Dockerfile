FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY apps/api ./apps/api
COPY packages/db ./packages/db

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @cfr-tracker/api build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3002
ENV HOST=0.0.0.0
WORKDIR /app
COPY --from=base /app/package.json /app/package.json
COPY --from=base /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=base /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=base /app/apps/api/package.json /app/apps/api/package.json
COPY --from=base /app/packages/db/package.json /app/packages/db/package.json
COPY --from=base /app/apps/api/dist /app/apps/api/dist
COPY --from=base /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=base /app/packages/db /app/packages/db

EXPOSE 3002
CMD ["pnpm", "--dir", "/app/apps/api", "start"]
