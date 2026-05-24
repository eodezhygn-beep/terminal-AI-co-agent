# Setup Guide

## Prerequisites

- Linux-based environment (Ubuntu, Codespaces, Termux, VPS)
- `git` installed
- `node` / `npm` or `python` available depending on implementation choice
- Optional: `docker` if containerized development is desired

## Recommended Setup

1. Clone the repository

```bash
git clone https://github.com/eodezhygn-beep/terminal-AI-co-agent.git
cd terminal-AI-co-agent
```

2. Install dependencies (if using Node.js)

```bash
npm install
```

3. Run the self-test

```bash
npm test
```

4. Use the CLI

```bash
node src/cli.js read README.md
node src/cli.js write ./tmp/note.txt "hello from CLI"
node src/cli.js mkdir ./tmp/sub
node src/cli.js exec "echo hello"
node src/cli.js ai "Summarize the repository in one sentence"
```

## Notes

- This repository now includes a Phase 1 core implementation for file operations, shell execution, and provider-agnostic AI calls.
- `OPENAI_API_KEY` or `OPENROUTER_API_KEY` is required for `ai` calls.
