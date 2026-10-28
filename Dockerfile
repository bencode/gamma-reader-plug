ARG NODE_IMAGE=node:24-slim

FROM ${NODE_IMAGE} AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY ui-packages/web/package.json ui-packages/web/package.json
COPY web-packages/server/package.json web-packages/server/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @gamma-reader-plug/server --filter @gamma-reader-plug/web build
RUN pnpm --filter @gamma-reader-plug/server deploy --prod --legacy /prod/server

FROM ${NODE_IMAGE}

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3304

WORKDIR /app

COPY --from=build --chown=node:node /prod/server ./web-packages/server
COPY --from=build --chown=node:node /app/ui-packages/web/dist ./ui-packages/web/dist

USER node

EXPOSE 3304

CMD ["node", "web-packages/server/dist/main.js"]
