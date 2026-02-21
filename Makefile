.PHONY: dev dev-backend dev-frontend test lint format docker-up docker-down

dev: dev-backend

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && python -m pytest tests/ -v

lint:
	cd backend && ruff check app/ tests/

lint-frontend:
	cd frontend && npx tsc --noEmit

format:
	cd backend && ruff format app/ tests/

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down
