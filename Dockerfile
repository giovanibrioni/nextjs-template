FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.8.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec next build
RUN npm install --prefix /opt/migrate --omit=dev drizzle-orm@0.45.3 pg@8.23.0

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /opt/migrate/node_modules /opt/migrate/node_modules
COPY --from=build --chown=node:node /app/drizzle /opt/migrate/drizzle
COPY --chown=node:node migrate.mjs /opt/migrate/migrate.mjs
USER node
EXPOSE 3000
CMD ["node", "server.js"]
