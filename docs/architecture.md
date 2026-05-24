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
