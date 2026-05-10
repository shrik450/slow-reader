FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=/app/data/slow-reader.db
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src ./src
RUN mkdir -p /app/data
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["bun", "run", "src/index.ts"]
