.PHONY: build run clean test lint format install release docker docker-run

SHELL := /bin/sh
VERSION := $(shell cat .version 2>/dev/null | tr -d '[:space:]' | sed 's/^v//')
COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")

build:
	bun run scripts/build.ts

build-all:
	./build.sh

run:
	bun run neorwc.ts

clean:
	rm -rf bin/ dist/ neorwc

test:
	bunx tsc --noEmit

lint:
	bunx tsc --noEmit --strict

format:
	bunx prettier --write "src/**/*.ts" "*.ts"

install:
	bun install

release: build-all
	@echo "Release $(VERSION) ready in bin/"

docker:
	docker build \
		--build-arg VERSION=$(VERSION) \
		--build-arg COMMIT=$(COMMIT) \
		-t neorwc:$(VERSION) \
		-t neorwc:latest .

docker-run:
	docker run --rm -it \
		-v $(PWD):/workspace \
		-e NEORWC_GOOGLE_KEY \
		-e OPENAI_API_KEY \
		-e ANTHROPIC_API_KEY \
		-e DEEPSEEK_API_KEY \
		-e MISTRAL_API_KEY \
		-e COHERE_API_KEY \
		neorwc:latest
