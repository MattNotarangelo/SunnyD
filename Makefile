.PHONY: dev build build-data test lint format

dev:
	cd frontend && npm run dev

build-data:
	python3 scripts/build_grids.py

build: build-data
	cd frontend && npm run build

test:
	cd backend && python -m pytest tests/ -v

lint:
	cd backend && ruff check app/ tests/

lint-frontend:
	cd frontend && npx tsc --noEmit

format:
	cd backend && ruff format app/ tests/
