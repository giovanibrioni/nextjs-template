# nextjs-template

Full-stack Next.js template. The app runs on the host with Node.js. Postgres runs in Docker.

The UI lives in `src/frontend` and calls `/api/v1`. Server code lives in `src/backend`.

## Prerequisites

- Node.js 24
- [pnpm](https://pnpm.io/), via Corepack (`corepack enable`)
- Docker, for Postgres
- [pre-commit](https://pre-commit.com/), only for the local git hook. CI does not need it. Install it with `uv tool install pre-commit` or `pipx install pre-commit`.

Port `5432` is the same one used by the Python template. Stop that stack before `make up`.

## Setup

```bash
make install
make up
make migrate
make dev
```

App: http://127.0.0.1:3000

Defaults match `.env.example`, including `DATABASE_URL` for the local database `app`. Copy `.env.example` to `.env` when you want to override them.

## Checks

```bash
make test
make lint
pre-commit install
```

`make test-unit` does not need Docker. `make test` uses the `app_test` database started by `make up`.

## Adapting the template

See the checklist in [AGENTS.md](AGENTS.md). Keep `src/frontend` and `src/backend` apart.
