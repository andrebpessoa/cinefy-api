# syntax=docker/dockerfile:1
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

ARG BUN_COMPILE_TARGET=bun-linux-x64
ENV NODE_ENV=production
RUN BUN_COMPILE_TARGET="${BUN_COMPILE_TARGET}" bun run build:docker

FROM debian:bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates curl \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build --chmod=755 /app/server ./server
COPY --from=build --chmod=755 /app/run-migrations ./run-migrations
COPY --from=build /app/src/db/migrations ./db/migrations
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV MIGRATIONS_FOLDER=/app/db/migrations

EXPOSE 3000

USER nobody:nogroup

ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
