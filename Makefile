.DEFAULT_GOAL := help

.PHONY: help install up down dev migrate revision test-unit test lint review

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-12s %s\n", $$1, $$2}'

install: ## Install dependencies
	pnpm install

up: ## Start Postgres and ensure the app_test database exists
	docker compose up -d --wait
	docker compose exec -T db psql -U postgres -tc \
	  "SELECT 1 FROM pg_database WHERE datname = 'app_test'" \
	  | grep -q 1 || docker compose exec -T db psql -U postgres -c "CREATE DATABASE app_test"

down: ## Stop Postgres
	docker compose down

dev: ## Run the app with reload on http://0.0.0.0:3000
	pnpm exec next dev --hostname 0.0.0.0 --port 3000

migrate: ## Apply database migrations
	pnpm exec drizzle-kit migrate

revision: ## Generate a migration; pass msg="describe the change"
	@if [ -z "$(msg)" ]; then echo 'Set msg, for example: make revision msg="add widgets"'; exit 1; fi
	pnpm exec drizzle-kit generate --name "$(msg)"

test-unit: ## Run unit and component tests
	pnpm exec vitest run --project unit --project frontend

test: ## Migrate app_test and run the full test suite
	DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_test pnpm exec drizzle-kit migrate
	DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_test pnpm exec vitest run

lint: ## Run Biome and TypeScript
	pnpm exec biome check .
	pnpm exec next typegen
	pnpm exec tsc --noEmit

review: ## Architecture, orphan, env, and merge-risk checks
	@status=0; \
	node .cursor/skills/nextjs-template-review/scripts/architecture_check.mjs || status=1; \
	node .cursor/skills/nextjs-template-review/scripts/orphan_check.mjs || status=1; \
	node .cursor/skills/nextjs-template-review/scripts/env_example_check.mjs || status=1; \
	node .cursor/skills/nextjs-template-review/scripts/merge_risk_check.mjs || status=1; \
	exit $$status
