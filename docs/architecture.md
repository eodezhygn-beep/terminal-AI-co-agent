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
- `src/io` - file and folder operations
- `src/terminal` - shell command execution and output capture
- `src/safety` - validation of commands to avoid destructive operations

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
