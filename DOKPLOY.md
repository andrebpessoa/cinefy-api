# Dokploy / produção — Cinefy

## Elysia em produção

- **`NODE_ENV=production`** — obrigatório no runtime. Desativa páginas de erro de desenvolvimento do Bun e ativa `serve.development: false` na app.
- **`PORT`** — porta HTTP (o Dokploy costuma injetar dinamicamente; localmente use `3000`).
- **`HOST`** — interface onde o servidor escuta. Por defeito **`0.0.0.0`** (todas as interfaces), adequado a Docker e ao proxy do Dokploy.
- **`GET /health`** — resposta `200` com `{ "status": "ok" }` e `cache-control: no-store`, pensado para healthchecks do Docker/Swarm no Dokploy.

## CI/CD (GitHub Actions)

Este repositório inclui [`.github/workflows/ci.yml`](.github/workflows/ci.yml), que em cada push/PR corre:

1. **`bun install --frozen-lockfile`**
2. **`biome check .`** (sem `--write`, para falhar no CI se o código não estiver formatado às regras do projeto — localmente use `bun run check` para corrigir automaticamente)
3. **`tsc --noEmit`**
4. **`bun test`**
5. **Build Docker** (valida o `Dockerfile`, sem publicar imagem)

**Porque faz sentido:** alinha-se ao que o [Dokploy recomenda para produção](https://docs.dokploy.com/docs/core/applications/going-production): o servidor Dokploy só **puxa uma imagem já construída** (GitHub Container Registry, Docker Hub, etc.), em vez de consumir RAM/CPU da VPS a compilar.

**Extensão típica:** um segundo workflow ou job que, só na branch `main`, execute `docker/build-push-action` com `push: true`, credenciais do registry e tag por SHA ou versão; no Dokploy, **Source Type → Docker** apontando para essa tag + webhook de redeploy.

Comando local equivalente ao pipeline de verificação: **`bun run ci`**.

Para validar código **e** imagem num só passo (requer Docker): **`bun run deploy:verify`** (`ci` + `docker build -t cinefy:local .`). Equivale a correr `docker build` manualmente — usa os scripts **`build:docker`** do `package.json`, como o estágio de build do Dockerfile.

## Checklist no Dokploy (Environment)

| Variável | Notas |
|----------|--------|
| **`DATABASE_URL`** | Postgres acessível **desde o contentor** (hostname do serviço na rede Docker, ex. `postgres`; não use `localhost` para referir o host). Use `?sslmode=require` se o provedor exigir TLS. Sem isto o processo pode falhar ao importar `db`. |
| **`NODE_ENV`** | `production` — a imagem já define; pode reforçar no painel. |
| **`BETTER_AUTH_SECRET`** | Secret forte. |
| **`BETTER_AUTH_URL`** | URL **pública** HTTPS da API (cookies / redirects do Better Auth). |
| **`VOD_PROVIDER_URL`**, **`SERIES_PROVIDER_URL`**, **`LIVE_PROVIDER_URL`** | Necessárias para o sync do catálogo em produção. |
| **`SYNC_API_KEY`** | Para rotas `POST /catalog/*/sync`. |
| **`ALLOWED_ORIGINS`** | Frontends permitidos no CORS (lista separada por vírgulas). |
| **`PORT` / domínio** | O proxy no Dokploy deve encaminhar para a mesma porta que a app escuta (por defeito **3000** na imagem, salvo `PORT` diferente). |

## Deploy recomendado no Dokploy

A [documentação do Dokploy](https://docs.dokploy.com/docs/core/applications/going-production) recomenda **não compilar na VPS**: gerar a imagem em CI e publicar num registry; no Dokploy usar **Source Type → Docker** com a imagem publicada (menos RAM/CPU na máquina do Dokploy).

Para **Build Type → Dockerfile** neste repositório:

1. **Dockerfile Path:** `Dockerfile`
2. **Docker Context Path:** `.`
3. Defina no runtime as variáveis da secção seguinte (aba Environment).
4. **Domínio:** ao criar domínio na app, use o mesmo **PORT** que `ENV PORT` (por defeito `3000`).

**Host ARM64:** ao construir a imagem para servidor ARM, passe `--build-arg BUN_COMPILE_TARGET=bun-linux-arm64` (o defeito do Dockerfile é `bun-linux-x64`).

### Healthcheck (Swarm / avançado)

No separador Advanced → Swarm Settings, pode usar um healthcheck HTTP para `/health` na porta da aplicação (ex.: `3000`), conforme o [guia “Going Production”](https://docs.dokploy.com/docs/core/applications/going-production). A imagem inclui `curl` para comandos do tipo `curl -fsS http://127.0.0.1:3000/health`.

## Migrações da base de dados no Dokploy

O Dokploy **não expõe** um único botão “correr migrações antes do deploy” na UI. O que existe na documentação oficial é:

- **[Schedule Jobs](https://docs.dokploy.com/docs/core/schedule-jobs)** — permitem executar um comando **dentro do contentor já em execução** (`docker exec`). Servem sobretudo para tarefas **agendadas** (cron). O [artigo sobre database deployment](https://dokploy.com/blog/database-deployment) menciona que equipas às vezes usam jobs para comandos padronizados de migração em ambientes específicos — **não substitui** uma migração no arranque do deploy se o objetivo é “schema atualizado antes do tráfego novo”.

### O que este projeto faz

A imagem Docker usa **`docker-entrypoint.sh`**: antes de iniciar o servidor compilado, executa o binário **`run-migrations`** (Drizzle via `drizzle-orm/node-postgres/migrator`), que aplica as pastas em `src/db/migrations` copiadas para `/app/db/migrations`. Assim, **cada novo deploy** que arranca o contentor aplica migrações pendentes com **`DATABASE_URL`** do runtime.

- **`SKIP_DB_MIGRATIONS=1`** — ignora migrações e arranca só o servidor (ex.: diagnóstico).

### Alternativas no Dokploy / CI

1. **CI/CD** — `bun run db:migrate` ou `bun run migrate:up` contra a BD de staging/produção **antes** de publicar a imagem ou de promover o deploy (fluxo descrito no [guia “Going Production”](https://docs.dokploy.com/docs/core/applications/going-production)).
2. **Schedule Job** — apenas se aceitar correr migrações **após** o contentor estar no ar (evitar corridas com várias réplicas; preferir **uma réplica** ou migrações na CI).

Desenvolvimento local continua a poder usar **`bun run db:migrate`** (CLI `drizzle-kit`) ou **`bun run migrate:up`** (mesmo motor de pastas SQL que a imagem).

## Variáveis de ambiente do catálogo

- **VOD_PROVIDER_URL** — URL do provider para filmes (`get_vod_streams`). Obrigatória em `NODE_ENV=production`.
- **SERIES_PROVIDER_URL** — URL para séries (`get_series`). Obrigatória em produção para sync fiável.
- **LIVE_PROVIDER_URL** — URL para canais ao vivo (`get_live_streams`). Obrigatória em produção para sync fiável.
- **CATALOG_PROVIDER_TIMEOUT_MS** — Timeout HTTP dos três fetchers (VOD, séries, live). Default 30000.
- **CATALOG_SYNC_CRON** — Expressão cron (UTC) para o `Bun.cron` do catálogo. O callback corre **em sequência**: VOD → séries → live; falha num tipo não cancela os seguintes (cada erro é registado com `kind`).
- **SYNC_API_KEY** — Bearer para `POST /catalog/*/sync` e consulta de jobs.

## Base de dados

- Migração `catalog_sync_state`: a tabela `vod_sync_state` foi renomeada para **`catalog_sync_state`**. A PK `id` aceita `vod`, `series` e `live` (estado de sync por tipo).
- Novas tabelas: **`series_items`**, **`live_stream_items`**. Em Docker as migrações aplicam-se no arranque do contentor; localmente use `bun run db:migrate` ou `bun run migrate:up`.

## Arranque

- No startup, disparam-se em paralelo três syncs em background (um por `kind`), cada um com o respetivo mutex — syncs de tipos diferentes podem correr ao mesmo tempo; o mesmo tipo não sobrepõe.
