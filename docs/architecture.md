# Architecture Overview

## Core System (Phase 1)

The initial system is intentionally minimal and deterministic, with a clear execution model:

- File access
  - read files
  - write files
  - create folders
- Shell execution
  - run commands
  - capture stdout/stderr
  - return exit codes

## Components

- `src/agent` - entrypoint for command/request execution
- `src/fs` - file and folder operations
- `src/terminal` - shell command execution and output capture
- `src/safety` - validation of commands to avoid destructive operations
- `src/retry` - retry wrapper for resilient operations
- `src/context` - compressed context extraction and smart file selection
- `src/debug` - debugging analysis and AI-assisted failure diagnostics

## Phase 2 Enhancements

The Phase 2 implementation adds:

- automatic retry support for transient shell failures
- error analysis for failed commands
- compressed file context generation
- prioritized file selection based on query keywords
- smarter CLI operations for debugging and context-aware workflows

## Phase 3 Preview

The Phase 3 skeleton includes:

- `src/planner.js` for task decomposition and plan creation
- `src/agent-manager.js` for multi-agent registration and orchestration
- `src/longRunning.js` for async task tracking
- `src/embeddings.js` for provider-agnostic semantic embedding support
- `src/agents/` with base and simple agent abstractions

Phase 3 is designed to enable autonomous planning and multi-agent workflows while keeping the system modular and extensible.

## Design Principles

- deterministic: no autonomous loops in Phase 1
- modular: separate concerns for I/O, execution, and logging
- cloud-friendly: designed to run in Codespaces, SSH, Termux, or similar
- provider-agnostic: AI provider integration is deferred until later phases

## Execution Model

1. Receive structured request
2. Validate request against safety rules
3. Execute file or shell action
4. Return structured result with success or error details
