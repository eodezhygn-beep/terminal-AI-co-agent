# Terminal AI Co-Agent

A minimal terminal-native AI coding system scaffold designed for cloud/SSH-based environments.

## Installation

```bash
npm install
```

You can run the CLI directly or install it globally:

```bash
node src/cli.js <command>
npm install -g .
ai <command>
```

## Environment Setup

Create a `.env` file in the repository root or copy the example:

```bash
cp .env.example .env
```

Add your provider keys:

```dotenv
OPENROUTER_API_KEY=your-openrouter-key
GEMINI_API_KEY=your-gemini-key
```

Supported environment variables:

- `OPENROUTER_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY` (supported for backward compatibility)
- `DEFAULT_PROVIDER` (e.g. `openrouter`, `gemini`, `openai`)
- `DEFAULT_MODEL`
- `AI_BASE_URL`
- task routing models: `PLANNING_MODEL`, `CODING_MODEL`, `DEBUG_MODEL`, `FALLBACK_MODEL`

## Provider Support

### OpenRouter

The default provider is `openrouter` when `OPENROUTER_API_KEY` is present. It supports chat completions and OpenAI-compatible embeddings.

Default model:

```dotenv
DEFAULT_MODEL=qwen/qwen3-next-80b-a3b-instruct
```

### Gemini

Gemini support is implemented using the Google AI Studio / Generative Language API format.

Default model:

```dotenv
FALLBACK_MODEL=gemini-2.5-flash
```

### OpenAI

OpenAI remains supported through `OPENAI_API_KEY` for backward compatibility.

## Task-based Model Routing

The CLI automatically selects a model based on prompt intent:

- architecture / planning / UX / frontend UI → `qwen/qwen3-next-80b-a3b-instruct`
- backend / APIs / AI orchestration → `qwen/qwen3-coder-480b-a35b-instruct`
- debugging / fixing bugs / frontend design → `deepseek/deepseek-v4-fast`
- summaries / fallback → `gemini-2.5-flash`

### Manual override

You can override the model explicitly:

```bash
node src/cli.js ai --model deepseek/deepseek-v4-fast "fix this bug"
```

## CLI Commands

```bash
node src/cli.js read <path>
node src/cli.js write <path> <content>
node src/cli.js mkdir <path>
node src/cli.js exec <command>
node src/cli.js retry <command>
node src/cli.js debug <command>
node src/cli.js select <query>
node src/cli.js context <path>
node src/cli.js plan "<task description>"
node src/cli.js embed "<text>"
node src/cli.js agent-list
node src/cli.js agent-run <agent> <task>
node src/cli.js longrun <name> <command>
node src/cli.js longrun-status <taskId>
node src/cli.js ai "<prompt>"
```

## Examples

```bash
node src/cli.js ai "build api"
node src/cli.js ai --model deepseek/deepseek-v4-fast "fix this bug"
node src/cli.js plan "Create an architecture plan for a terminal AI agent"
node src/cli.js embed "terminal ai assistant"
```

## Testing

Run the test harness:

```bash
npm test
```

## Notes

- `.env` is loaded automatically at startup via `dotenv`.
- Provider selection prioritizes:
  1. explicit CLI model flag
  2. task router
  3. configured default provider
  4. fallback provider
- If no provider key is configured, the CLI prints a clear error message explaining the required `.env` variables.
