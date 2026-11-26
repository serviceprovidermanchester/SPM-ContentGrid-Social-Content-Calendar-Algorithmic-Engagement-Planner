.PHONY: help run dev test seed check docker-build docker-up docker-down clean

help:
	@echo "ContentGrid — Developer Automation (SPManchester Private Limited)"
	@echo ""
	@echo "Targets:"
	@echo "  make run           Start server at http://localhost:4000"
	@echo "  make dev           Start server in Node watch mode"
	@echo "  make test          Run end-to-end test suite"
	@echo "  make seed          Seed the showcase data"
	@echo "  make check         Syntax-check all backend code"
	@echo "  make docker-build  Build container image"
	@echo "  make docker-up     Start container with compose"
	@echo "  make docker-down   Stop compose container"
	@echo "  make clean         Remove local sqlite test artifacts"

run:
	node backend/src/server.js

dev:
	node --watch backend/src/server.js

test:
	node tests/run-tests.js

seed:
	node backend/src/seed.js

check:
	npm run check

docker-build:
	docker build -t spmanchester/contentgrid:latest .

docker-up:
	docker compose up -d

docker-down:
	docker compose down

clean:
	rm -f backend/data/*.sqlite*
