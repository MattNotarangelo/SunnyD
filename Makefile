VENV := .venv
PIP := $(VENV)/bin/pip
PYTHON := $(VENV)/bin/python

.PHONY: dev build build-data lint venv

venv: $(VENV)/.installed

$(VENV)/.installed: scripts/requirements.txt
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r scripts/requirements.txt
	@touch $@

dev:
	npm run dev

build-data: venv
	$(PYTHON) scripts/1_download_uv.py
	$(PYTHON) scripts/2_build_temperature_nc.py
	$(PYTHON) scripts/3_build_grids.py

build: build-data
	npm run build

lint:
	npx tsc --noEmit
