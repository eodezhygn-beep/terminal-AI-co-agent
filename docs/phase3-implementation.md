# Phase 3: Safe Terminal Command Execution

## Overview

Phase 3 adds **safe terminal command execution with explicit user approval**, completing the terminal-AI-co-agent workflow. Building on Phase 1 (approval workflow) and Phase 2 (filesystem operations), Phase 3 enables the CLI to execute terminal commands safely, with comprehensive logging and failure handling.

## Key Design Principles

1. **Safety First** — Commands are validated against dangerous patterns before execution
2. **Explicit Approval** — Users must approve terminal execution separately from filesystem changes
3. **No Hidden Execution** — All terminal actions are logged with stdout/stderr captured
4. **Graceful Failures** — If a command fails, the user can choose to continue or cancel
5. **Mobile-Friendly** — Output is formatted for Termux and SSH workflows

## Workflow

```
1. User: ai agent-run local "Create login system"

2. AI generates plan (filesystem + terminal actions)

3. User approves filesystem operations
   ↓
4. Filesystem actions execute
   ↓
5. If terminal commands needed:
   - CLI shows commands for approval
   - User explicitly approves terminal execution
   - Commands execute with logging
   - Results captured (stdout/stderr/exit code)
   ↓
6. Final summary shows all results
```

## New Architecture Components

### 1. Enhanced Safety Module (`src/safety.js`)

Comprehensive command validation with:

- **`analyzeShellCommand(command)`** — Checks command safety, returns detailed result
- **`classifyCommand(command)`** — Classifies command as safe/unknown/dangerous
- **Dangerous Patterns Blocked:**
  - Destructive: `rm`, `rm -rf`, `dd`, `mkfs`
  - Privilege: `sudo`
  - System control: `shutdown`, `reboot`, `halt`, `killall`
  - Dangerous redirects: `> /etc/`, `> /sys/`
  - Shell injection: `| bash`, `;bash`, backticks, `$()`
  - Permission changes: `chmod -R /`, `chown -R /`

- **Safe Commands Allowed:**
  - `npm install/test/run/build`
  - `node`, `npx`, `git`, `yarn`, `pnpm`
  - `ls`, `cat`, `grep`, `find`, `mkdir`, `curl http://`, `wget http://`

### 2. Extended Planner (`src/planner.js`)

New methods:

- **`extractTerminalActions(taskDescription)`** — Detects terminal commands from task description
  - Recognizes: `npm install`, `npm test`, `npx prisma migrate`, `git` operations
  - Returns command objects with category metadata

### 3. Terminal Executor (`src/terminal-executor.js`)

Standalone module (also exported from `executor.js`):

- **`executeTerminalActions(actions)`** — Executes terminal commands with:
  - Safety validation before each command
  - Stdout/stderr capture and display
  - Exit code tracking
  - Failure prompts asking user to continue/cancel

### 4. Extended Approval (`src/approval.js`)

New functions:

- **`formatTerminalApprovalPlan(commands)`** — Formats terminal commands for user approval
- **`promptTerminalApproval()`** — Requests separate approval for terminal execution

### 5. Enhanced Executor (`src/executor.js`)

New function:

- **`executeTerminalActions(actions)`** — Phase 3 terminal command execution
  - Validates each command before execution
  - Logs execution with `[step/total]` format
  - Shows `⟳ executing...` progress indicator
  - Displays `✓ success` or `✗ failed`
  - Captures and displays output
  - Handles failures gracefully

### 6. Updated CLI (`src/cli.js`)

Enhanced `agent-run` command with three-phase execution:

**Phase 1:** Filesystem approval
```
[1] Show filesystem plan
[2] User approves/rejects
[3] If approved, execute filesystem actions
```

**Phase 2:** Terminal approval (if commands needed)
```
[1] Show terminal commands
[2] User approves/rejects
[3] If approved, execute commands with logging
```

**Phase 3:** Comprehensive summary
```
- Filesystem operations (created/edited/failed)
- Terminal commands (executed/failed)
- All changed files listed
```

## Execution Example

```
$ ai agent-run local "Install dependencies and run tests"

PLAN
Goal: Install dependencies and run tests
Proposed actions:
[CREATE]
- src/index.js
[EDIT]
- none
[INSTALL]
- npm install
[COMMANDS]
- npm test
Changed files:
- src/index.js
Reasoning: Plan generated from task description: "..."
Proceed? (y/n)
> y

Filesystem execution approved.
[1/1] Writing src/index.js
✓ success

TERMINAL ACTIONS REQUIRED

Commands proposed:
[1]
npm install
Category: install

[2]
npm test
Category: test

Proceed with terminal commands? (y/n)
> y

Terminal execution approved.

[1/2] Running:
npm install

⟳ executing...
✓ success

stdout:
added 12 packages in 2s

[2/2] Running:
npm test

⟳ executing...
✓ success

stdout:
  2 passing (45ms)

═══════════════════════════════
EXECUTION SUMMARY
═══════════════════════════════

Filesystem operations:
  Created: 1
  Edited: 0
  Skipped: 0
  Failed: 0

Terminal commands:
  Executed: 2
  Failed: 0
  Skipped: 0

Created files:
  - src/index.js

Executed commands:
  - npm install
  - npm test

═══════════════════════════════
```

## Blocked Command Example

```
$ ai agent-run local "Clean up files"

[1/1] Running:
rm -rf ./

⟳ executing...
✗ BLOCKED
  Reason: Unsafe operation - command matches dangerous pattern

Continue? (y/n)
> n

Execution cancelled by user.

Failed commands:
  - rm -rf ./ (BLOCKED: Unsafe operation - command matches dangerous pattern)
```

## Error Handling

If a terminal command fails (non-zero exit code):

```
[1/2] Running:
npm run migrate

⟳ executing...
✗ failed
  Exit code: 1

stderr:
Error: Database connection failed

Continue? (y/n)
> n

Execution cancelled by user.
```

## Safety Validation Logic

```javascript
const safety = analyzeShellCommand(command);

if (!safety.safe) {
  // Command is dangerous - block it
  console.log('✗ BLOCKED');
  console.log(safety.reason);
} else if (safety.isSuspicious) {
  // Command is allowed but unknown - proceed with caution
  console.log('⚠️  Warning: Unknown command');
} else {
  // Command is safe - execute normally
  console.log('✓ Executing');
}
```

## Changed Files

### New Files
- `src/terminal-executor.js` — Terminal command execution module (exported from executor.js)

### Modified Files
- `src/safety.js` — Enhanced with comprehensive patterns, added classification functions
- `src/planner.js` — Added `extractTerminalActions()` method
- `src/approval.js` — Added terminal approval formatting functions
- `src/executor.js` — Added `executeTerminalActions()` function
- `src/cli.js` — Enhanced `agent-run` with Phase 3 three-phase workflow

## Design Decisions

### Why Separate Approvals?

Filesystem and terminal operations have different risk profiles:
- Filesystem changes are localized (working directory)
- Terminal commands can have system-wide effects
- Users should approve each phase separately

### Why Blocking Patterns?

Patterns are blocked to prevent accidental data loss:
- `rm` / `rm -rf` — Could delete project or system files
- `sudo` — Could require user interaction or escalate privileges
- Shell injection patterns — Could execute unintended code
- System redirects — Could corrupt system files

The allowlist (`SAFE_COMMANDS`) includes common development workflows:
- Package managers: `npm`, `yarn`, `pnpm`, `npx`
- Runtime: `node`
- Version control: `git`
- Utilities: `ls`, `cat`, `grep`, `find`, `mkdir`
- Safe network: `curl http://`, `wget http://`

### Why Failure Prompts?

If one command fails, the user should decide whether to:
- Continue with remaining commands
- Stop and debug the failure

This prevents cascading failures and preserves partial progress.

### Why Not Auto-Retry?

Auto-retry is explicitly forbidden (per requirements) to ensure:
- User awareness of failures
- Prevention of resource waste (repeated failed installs)
- Debugging feedback (user sees failure messages)

## Future Extensions

Phase 4 could add:
- AI-powered debugging (analyze failures, suggest fixes)
- Command history and replay
- Output logging to file
- Parallel command execution
- Advanced dependency detection

## Examples

### Simple Task
```bash
ai agent-run local "Create a test file"
# Only filesystem: creates test file, no terminal approval needed
```

### With Dependencies
```bash
ai agent-run local "Create login system with dependencies"
# Filesystem: creates auth scaffolding
# Terminal: [npm install jsonwebtoken bcrypt]
# User approves both phases
```

### Mobile Workflow
```bash
# On Termux: all output optimized for terminal width
ai agent-run local "Install and test"
# Clean formatting, proper line breaks, readable on small screens
```

### SSH Workflow
```bash
# Over SSH: no interactive issues, proper signal handling
ai agent-run local "Deploy to production"
# Captures all output
# Handles network interruptions gracefully
```

## Testing Phase 3

```bash
# Test safe command
ai agent-run local "Run tests"
# Should execute: npm test

# Test blocked command (would fail)
# Modify a task to include: rm -rf ./
# CLI should block without executing

# Test failure handling
ai agent-run local "Run nonexistent command"
# Should prompt to continue on failure
```

## Backward Compatibility

Phase 3 is fully backward compatible:
- Phase 1 approval workflow unchanged
- Phase 2 filesystem operations unchanged
- If no terminal commands, workflow is identical to Phase 2
- Existing `agent-run` tasks work unchanged

## Requirements Met

✓ User approves plan  
✓ AI generates filesystem actions  
✓ Filesystem actions execute  
✓ If terminal commands needed, ask for approval  
✓ Show terminal commands for review  
✓ Block dangerous commands  
✓ Execute with logging (stdout/stderr)  
✓ Handle failures gracefully  
✓ Show final summary  
✓ Reuse terminal.js  
✓ Modular architecture  
✓ Mobile-friendly output  
✓ Never crash CLI  
✓ Safety first design  
