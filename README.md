# Cinefy

Backend **Bun + Elysia + Drizzle + Postgres + Better Auth** para catálogo VOD, séries e canais ao vivo (sync assíncrono e jobs persistidos).

## Requisitos

- [Bun](https://bun.sh) ≥ 1.3
- Postgres 16+ (local via Docker Compose ou serviço gerenciado)
- Redis 7+ **obrigatório** (rate limit do catálogo e Better Auth; o Compose sobe um serviço `redis`)

## Configuração rápida

1. Copie variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

2. Suba Postgres e Redis e aplique migrações:

   ```bash
   bun run db:up
   bun run migrate:up
   ```

3. Desenvolvimento:

   ```bash
   bun run dev
   ```

4. CI local:

   ```bash
   bun run ci
   ```

## Endpoints principais

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/health` | Healthcheck (sem cache) |
| GET | `/openapi` | Documentação OpenAPI |
| GET | `/v1/catalog/{vod\|series\|live}` | Lista paginada (`page`, `limit`), `ETag` + `Cache-Control` |
| POST | `/v1/catalog/{vod\|series\|live}/sync` | Dispara sync (Bearer `SYNC_API_KEY`), `202` + header `Location` |
| GET | `/v1/catalog/.../sync/jobs/:id` | Estado do job |
| * | `/auth/*` | Better Auth (`basePath` `/api` → rotas em `/auth/api/...`) |

## Variáveis de ambiente

Ver [`.env.example`](.env.example). Destaques:

- `DATABASE_URL`, `PG_SSL` — Postgres e SSL
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — auth
- `SYNC_API_KEY` — bearer para POST de sync (obrigatório em produção com validação completa)
- `VOD_PROVIDER_URL`, `SERIES_PROVIDER_URL`, `LIVE_PROVIDER_URL` — URLs dos providers (obrigatórias em runtime em produção; validação adicional no código dos providers)
- `CATALOG_SYNC_CRON`, `CATALOG_SYNC_MIN_RETENTION_FRACTION` — agendamento e guarda de retenção no sync
- `ALLOWED_ORIGINS` — CORS (lista separada por vírgula)
- `REDIS_URL` — Redis para rate limit do catálogo (`/v1/catalog/*`) e armazenamento secundário Better Auth (padrão local: `redis://localhost:6379`)
- `SKIP_ENV_VALIDATION` — apenas para tooling/testes pontuais

## Redis (rate limit + Better Auth)

O servidor exige um Redis acessível em `REDIS_URL` (ex.: `redis://localhost:6379` após `bun run db:up`). Os contadores de rate limit do catálogo e o storage de rate limit do Better Auth usam sempre o cliente `bun:redis` — não há fallback em memória.

## Docker

Build multi-stage (binários compilados + Debian slim). Imagem de build: `oven/bun:1.3.13-slim`.

```bash
docker build -t cinefy:local .
```
