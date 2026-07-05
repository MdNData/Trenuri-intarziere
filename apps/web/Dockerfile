FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/web/next.config.ts ./apps/web/next.config.ts
COPY apps/web/postcss.config.mjs ./apps/web/postcss.config.mjs
COPY apps/web/tsconfig.json ./apps/web/tsconfig.json
COPY apps/web/next-env.d.ts ./apps/web/next-env.d.ts
COPY apps/web/src ./apps/web/src
COPY apps/web/public ./apps/web/public
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile
ARG NEXT_PUBLIC_API_URL=http://localhost:3002
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @cfr-tracker/web build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3003
WORKDIR /app
COPY --from=base /app/package.json /app/package.json
COPY --from=base /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=base /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=base /app/apps/web/package.json /app/apps/web/package.json
COPY --from=base /app/apps/web/.next /app/apps/web/.next
COPY --from=base /app/apps/web/public /app/apps/web/public
COPY --from=base /app/apps/web/next.config.ts /app/apps/web/next.config.ts
COPY --from=base /app/apps/web/node_modules /app/apps/web/node_modules

EXPOSE 3003
CMD ["pnpm", "--dir", "/app/apps/web", "start", "-p", "3003"]
