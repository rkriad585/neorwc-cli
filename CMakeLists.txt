cmake_minimum_required(VERSION 3.20)
project(neorwc
  VERSION 1.1.0
  DESCRIPTION "Neo Read Write Create — AI-powered documentation suite"
  LANGUAGES NONE
)

message(STATUS "neorwc v${PROJECT_VERSION}")
message(STATUS "")
message(STATUS "This project uses Bun and TypeScript — not CMake.")
message(STATUS "CMake is provided for IDE integration and project structure only.")
message(STATUS "")
message(STATUS "Build commands:")
message(STATUS "  make build       — Build current platform binary")
message(STATUS "  make build-all   — Cross-platform build (5 targets)")
message(STATUS "  make run         — Run from source")
message(STATUS "  make test        — Type-check with tsc")
message(STATUS "  make install     — Install dependencies")
message(STATUS "  make docker      — Build Docker image")
message(STATUS "")
message(STATUS "See Makefile or README.md for full details.")
