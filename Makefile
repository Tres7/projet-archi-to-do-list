SHELL := /bin/bash
.SHELLFLAGS := -e -o pipefail -c

ROOT_DIR := $(CURDIR)
CLIENT_DIR := $(ROOT_DIR)/client
SERVER_DIR := $(ROOT_DIR)/server
LOG_DIR := $(ROOT_DIR)/.make-logs

NPM_CLIENT := npm --prefix $(CLIENT_DIR)
NPM_SERVER := npm --prefix $(SERVER_DIR)
COMPOSE := docker compose --project-directory $(ROOT_DIR) -f $(ROOT_DIR)/compose.yaml
CI_COMPOSE := docker compose --project-name projet-archi-ci --project-directory $(ROOT_DIR) -f $(ROOT_DIR)/compose.yaml

.DEFAULT_GOAL := help

.PHONY: help install install-client install-server install-playwright \
	build build-docker \
	up up-local up-backend up-frontend up-docker \
	infra-up down clean docker-down docker-clean \
	test-backend test-backend-unit test-backend-integration test-backend-e2e \
	coverage-backend-unit coverage-backend-integration coverage-backend-e2e coverage-backend-all \
	test-frontend test-frontend-e2e \
	ci-backend-integration ci-backend-e2e ci-frontend-e2e

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "%-22s %s\n", $$1, $$2}'

install: install-server install-client install-playwright ## Install backend/frontend deps and Playwright browsers

install-server: ## Install backend dependencies
	$(NPM_SERVER) ci

install-client: ## Install frontend dependencies
	$(NPM_CLIENT) ci

install-playwright: ## Install Playwright browsers for frontend E2E
	cd $(CLIENT_DIR) && npx playwright install

build: ## Build backend and frontend locally
	$(NPM_SERVER) run build
	$(NPM_CLIENT) run build

build-docker: ## Build Docker images for the full project
	$(COMPOSE) build

infra-up: ## Start dockerized infrastructure only (db, redis, mailpit)
	$(COMPOSE) up -d db redis mailpit

up-backend: infra-up ## Run backend locally (infrastructure stays in Docker)
	$(NPM_SERVER) run dev:all

up-frontend: ## Run frontend locally
	$(NPM_CLIENT) run dev

up-local: infra-up ## Run backend and frontend locally
	cd $(SERVER_DIR) && npx concurrently -n backend,frontend \
		"npm run dev:all" \
		"npm --prefix $(CLIENT_DIR) run dev"

up: up-local ## Alias for local full-stack run

up-docker: ## Run the full project in Docker Compose
	$(COMPOSE) up --build -d

down: ## Stop all running compose containers
	$(COMPOSE) down

clean: ## Stop containers and remove volumes/images/orphans
	$(COMPOSE) down -v --rmi all --remove-orphans

docker-down: down ## Alias for down

docker-clean: clean ## Alias for clean

test-backend: ## Run the full backend test suite (starts infra because backend E2E needs it)
	trap '$(COMPOSE) down >/dev/null 2>&1 || true' EXIT INT TERM; \
	$(COMPOSE) up -d db redis mailpit; \
	cd $(SERVER_DIR) && npx wait-port localhost:3306 localhost:6379 localhost:1025; \
	$(NPM_SERVER) run test

test-backend-unit: ## Run backend unit tests only
	$(NPM_SERVER) run test:unit

test-backend-integration: ## Run backend integration tests only
	$(NPM_SERVER) run test:integration

test-backend-e2e: ## Run backend E2E tests only (starts infra automatically)
	trap '$(COMPOSE) down >/dev/null 2>&1 || true' EXIT INT TERM; \
	$(COMPOSE) up -d db redis mailpit; \
	cd $(SERVER_DIR) && npx wait-port localhost:3306 localhost:6379 localhost:1025; \
	$(NPM_SERVER) run test:e2e

coverage-backend-unit: ## Run backend unit tests with coverage
	$(NPM_SERVER) run coverage:unit

coverage-backend-integration: ## Run backend integration tests with coverage
	$(NPM_SERVER) run coverage:integration

coverage-backend-e2e: ## Run backend E2E tests with coverage
	trap '$(COMPOSE) down >/dev/null 2>&1 || true' EXIT INT TERM; \
	$(COMPOSE) up -d db redis mailpit; \
	cd $(SERVER_DIR) && npx wait-port localhost:3306 localhost:6379 localhost:1025; \
	$(NPM_SERVER) run coverage:e2e

coverage-backend-all: ## Run all backend coverage reports
	$(MAKE) coverage-backend-unit
	$(MAKE) coverage-backend-integration
	$(MAKE) coverage-backend-e2e

test-frontend: ## Run frontend Playwright E2E (starts infra, backend and frontend, then stops everything)
	mkdir -p $(LOG_DIR); \
	BACK_PID=''; \
	FRONT_PID=''; \
	stop_group() { \
		local pid="$$1"; \
		if [[ -n "$$pid" ]] && kill -0 "$$pid" 2>/dev/null; then \
			kill -TERM -- "-$$pid" 2>/dev/null || kill "$$pid" 2>/dev/null || true; \
			wait "$$pid" 2>/dev/null || true; \
		fi; \
	}; \
	cleanup() { \
		stop_group "$$FRONT_PID"; \
		stop_group "$$BACK_PID"; \
		$(COMPOSE) down >/dev/null 2>&1 || true; \
	}; \
	trap cleanup EXIT INT TERM; \
	$(COMPOSE) up -d db redis mailpit; \
	cd $(SERVER_DIR) && npx wait-port localhost:3306 localhost:6379 localhost:1025; \
	setsid $(NPM_SERVER) run dev:all > $(LOG_DIR)/backend-e2e.log 2>&1 & BACK_PID=$$!; \
	setsid $(NPM_CLIENT) run dev > $(LOG_DIR)/frontend-e2e.log 2>&1 & FRONT_PID=$$!; \
	cd $(SERVER_DIR) && npx wait-port localhost:3000 localhost:3001 localhost:3002 localhost:3003 localhost:3004 localhost:5173; \
	$(NPM_CLIENT) run test:e2e

ci-backend-integration: ## CI: run backend integration tests with compose-managed infra
	mkdir -p $(SERVER_DIR)/test_outputs; \
	trap '$(CI_COMPOSE) down -v --remove-orphans >/dev/null 2>&1 || true' EXIT INT TERM; \
	$(CI_COMPOSE) up -d db; \
	cd $(SERVER_DIR) && npx wait-port localhost:3306; \
	$(NPM_SERVER) run test:integration -- --coverage --json --outputFile=integration-results.json

ci-backend-e2e: ## CI: run backend E2E tests with compose-managed infra
	mkdir -p $(SERVER_DIR)/test_outputs; \
	trap '$(CI_COMPOSE) down -v --remove-orphans >/dev/null 2>&1 || true' EXIT INT TERM; \
	$(CI_COMPOSE) up -d db redis mailpit; \
	cd $(SERVER_DIR) && npx wait-port localhost:3306 localhost:6379 localhost:1025; \
	$(NPM_SERVER) run test:e2e -- --coverage --json --outputFile=e2e-results.json

ci-frontend-e2e: ## CI: run frontend Playwright E2E with compose-managed infra
	mkdir -p $(SERVER_DIR)/test_outputs; \
	trap '$(CI_COMPOSE) down -v --remove-orphans >/dev/null 2>&1 || true' EXIT INT TERM; \
	$(CI_COMPOSE) up -d db redis mailpit; \
	cd $(SERVER_DIR) && npx wait-port localhost:3306 localhost:6379 localhost:1025; \
	$(NPM_CLIENT) run test:e2e
