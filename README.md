# Terminal AI Co-Agent

A minimal terminal-native AI coding system scaffold designed for cloud/SSH-based environments.

## Goals

- Phase 1: implement deterministic core features
  - read file contents
  - write files
  - create folders
  - execute shell commands
  - capture command output and errors
- Phase 2: add debugging, retry, and context intelligence
- Phase 3: add autonomous planning and provider-agnostic AI integration

## Repository Structure

- `src/` - primary implementation code
- `docs/` - architecture, setup, and design docs
- `scripts/` - utility scripts and helpers
- `tests/` - unit/integration tests

## Current Status

Phase 1 core implementation is added with file operations, folder creation, shell execution, safety validation, and a simple AI provider abstraction.
Phase 2 features are also included for retry logic, debugging support, context compression, and smarter file selection.

## CLI Usage

Install dependencies (optional, no external deps currently):

```bash
npm install
```

Run the CLI directly:

```bash
node src/cli.js read README.md
node src/cli.js write ./tmp/note.txt "hello from CLI"
node src/cli.js mkdir ./tmp/sub
node src/cli.js exec "echo hello"
node src/cli.js retry "echo hello"
node src/cli.js debug "false"
node src/cli.js select "README architecture"
node src/cli.js context README.md
node src/cli.js plan "Build a repository scaffold and add Phase 3 planning support"
node src/cli.js embed "terminal ai agent"
node src/cli.js agent-list
node src/cli.js agent-run local "write README.md with new CLI examples"
node src/cli.js longrun example "sleep 1 && echo done"
node src/cli.js longrun-status <taskId>
node src/cli.js ai "Summarize the repository in one sentence"
```

Or install the package globally for the `ai` command:

```bash
npm install -g .
```

## Next Steps

1. Add CLI argument parsing and command validation
2. Expand AI provider support and error handling
3. Add functional tests for the CLI and AI integration
