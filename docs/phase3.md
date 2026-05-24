# Phase 3: Autonomous Planning and Multi-Agent System

## Goals

- Add a planning layer that can decompose tasks into smaller actionable steps
- Provide a multi-agent orchestration layer for task delegation
- Support long-running tasks with progress and status tracking
- Add optional embedding support for semantic search and similarity matching

## Components

- `src/planner.js` — high-level task decomposition and plan creation
- `src/agent-manager.js` — register agents and dispatch tasks
- `src/longRunning.js` — manage asynchronous long-running operations
- `src/embeddings.js` — provider-agnostic embedding generation
- `src/agents/` — agent implementations and base classes

## Workflow

1. A user requests a plan for a task.
2. The planner decomposes the task into steps.
3. An agent manager assigns steps to registered agents.
4. Long-running tasks can be created and monitored separately.
5. Optional embeddings can map text to vectors for future semantic retrieval.

## Notes

- Current implementation is a scaffolding layer; the planner uses simple rule-based decomposition.
- Agents can be extended to support external workers, tool execution, and more advanced coordination.
- The embeddings module includes OpenAI/OpenRouter support, with a stub fallback when no provider is configured.
