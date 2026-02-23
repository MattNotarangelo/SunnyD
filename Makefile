.PHONY: dev build build-data lint

dev:
	npm run dev

build-data:
	python3 scripts/3_build_grids.py

build: build-data
	npm run build

lint:
	npx tsc --noEmit
