.PHONY: help install update lint lint-fix test build clean watch setup

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: setup ## Install dependencies
	npm install

setup: ## Install git hooks
	cp scripts/pre-commit .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit
	@echo "Git hooks installed"

update: ## Update all packages to latest compatible versions
	npm update
	@echo "Updated packages. Run 'make test' to verify."

lint: ## Lint source and scripts
	npx eslint src/ scripts/

lint-fix: ## Lint and auto-fix
	npx eslint src/ scripts/ --fix

test: lint ## Lint then run test suite
	npx jest

test-watch: ## Run tests in watch mode
	npx jest --watch

test-verbose: lint ## Lint then run tests with verbose output
	npx jest --verbose

test-coverage: lint ## Lint then run tests with coverage report
	npx jest --coverage

build: ## Build dist bundle (concat + minify)
	npm run build

clean: ## Remove dist and node_modules
	rm -rf dist node_modules

rebuild: clean install build ## Clean, install, and build from scratch

ci: install test build ## Simulate full CI pipeline locally
