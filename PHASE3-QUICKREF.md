# Phase 3 Quick Reference

## Command Safety Validation

### Check if command is safe:
```javascript
import { analyzeShellCommand, classifyCommand } from './safety.js';

// Get detailed analysis
const result = analyzeShellCommand('npm install');
// → { safe: true, reason: 'Safe command', isSuspicious: false }

// Get classification summary
const classified = classifyCommand('rm -rf ./');
// → { safe: false, suspicious: false, reason: 'Unsafe operation...' }
```

## Terminal Execution

### Execute multiple commands with approval:
```javascript
import { executeTerminalActions } from './executor.js';

const actions = [
  { command: 'npm install' },
  { command: 'npm test' }
];

const result = await executeTerminalActions(actions);
// result.executed = commands that succeeded
// result.failed = commands that failed
// result.skipped = commands that were skipped
```

## Approval Workflow

### Show filesystem plan and get approval:
```javascript
import { formatApprovalPlan, promptApproval } from './approval.js';

const plan = planner.createApprovalPlan(task);
console.log(formatApprovalPlan(plan));
const approved = await promptApproval();
```

### Show terminal commands and get approval:
```javascript
import { formatTerminalApprovalPlan, promptTerminalApproval } from './approval.js';

const commands = plan.terminalActions;
console.log(formatTerminalApprovalPlan(commands));
const approved = await promptTerminalApproval();
```

## CLI Usage

### Complete workflow:
```bash
ai agent-run local "Create login system"

# User sees:
# 1. PLAN with filesystem actions
# 2. Approval prompt (y/n)
# 3. Filesystem execution with logging
# 4. TERMINAL ACTIONS with commands
# 5. Terminal approval prompt (y/n)
# 6. Terminal execution with logging
# 7. EXECUTION SUMMARY with all results
```

## Blocked Commands

These patterns are **always blocked**:
- `rm`, `rm -rf` (file deletion)
- `sudo` (privilege escalation)
- `shutdown`, `reboot`, `halt` (system control)
- `chmod -R /`, `chown -R /` (permission changes on system)
- `| bash`, `;sh`, `$(rm ...)` (shell injection)
- `> /etc/`, `> /sys/` (system redirect)

## Safe Commands (Allowed)

These patterns are **always allowed**:
- `npm install|test|run|build|start|list`
- `node`, `npx`, `yarn`, `pnpm`
- `git` (any subcommand)
- `ls`, `cat`, `grep`, `find`, `mkdir`, `touch`
- `curl http://`, `wget http://` (download)

## Failure Handling

When a command fails:
```
✗ failed
  Exit code: 1

stderr:
Error message here...

Continue? (y/n)
> y  # Continue with next command
> n  # Cancel execution
```

## Output Capture

```
[1/2] Running:
npm install

⟳ executing...
✓ success

stdout:
added 12 packages, removed 2 packages

stderr:
(none)
```

## Execution Summary

```
═══════════════════════════════
EXECUTION SUMMARY
═══════════════════════════════

Filesystem operations:
  Created: 3
  Edited: 2
  Skipped: 0
  Failed: 0

Terminal commands:
  Executed: 2
  Failed: 0
  Skipped: 0

Created files:
  - src/index.js
  - src/auth.js
  - .env.example

Edited files:
  - README.md
  - package.json

Executed commands:
  - npm install
  - npm test

═══════════════════════════════
```

## Error Handling

### Dangerous command detected:
```
[1/1] Running:
rm -rf ./

⟳ executing...
✗ BLOCKED
  Reason: Unsafe operation - command matches dangerous pattern

Continue? (y/n)
> n
```

### Command execution error:
```
[1/2] Running:
npm run build

⟳ executing...
✗ failed
  Exit code: 2

stderr:
Build failed: Could not find file src/index.js

Continue? (y/n)
> n
```

## Testing Commands

### Test safe approval:
```bash
ai agent-run local "Run tests"
# Answer: y
# Answer: y
# Should create files and run: npm test
```

### Test terminal approval rejection:
```bash
ai agent-run local "Install and test"
# Answer: y (approve filesystem)
# Answer: n (reject terminal)
# Should skip terminal execution
```

### Test cancellation on failure:
```bash
ai agent-run local "Run bad command"
# Task contains failing command
# Should prompt on failure
# Answer: n
# Should stop execution
```

## Customizing Safety Rules

To add a new dangerous pattern:

```javascript
// In src/safety.js, add to DANGEROUS_PATTERNS:
/\bdangerous-keyword\b/i,
```

To add a new safe command:

```javascript
// In src/safety.js, add to SAFE_COMMANDS:
/^my-safe-tool\s+/i,
```

## Architecture Overview

```
CLI (src/cli.js)
  ↓
Planner (src/planner.js)
  ├── createApprovalPlan() [Filesystem + Terminal]
  ├── createExecutionPlan() [Filesystem]
  └── extractTerminalActions() [Terminal detection]
  ↓
Approval (src/approval.js)
  ├── formatApprovalPlan() [Filesystem]
  ├── formatTerminalApprovalPlan() [Terminal]
  ├── promptApproval() [User input]
  └── promptTerminalApproval() [User input]
  ↓
Execution
  ├── Filesystem (executor.js: executePlan())
  └── Terminal (executor.js: executeTerminalActions())
       ↓
       Safety (safety.js: analyzeShellCommand())
       ↓
       Terminal (terminal.js: execShell())
```

## Key Classes

### CommandSafetyResult
```javascript
{
  command: string,      // The command that was analyzed
  safe: boolean,        // Is the command safe to execute?
  reason: string,       // Why safe or unsafe
  isSuspicious: boolean // Is it unknown but allowed?
}
```

### TerminalExecutionResult
```javascript
{
  command: string,      // The command executed
  success: boolean,     // Did it succeed?
  stdout: string,       // Standard output
  stderr: string,       // Standard error
  code: number,         // Exit code
  timestamp: string     // When it ran
}
```

## Debugging Tips

### Check if command is blocked:
```javascript
const { safe, reason } = analyzeShellCommand('your-command');
console.log(safe ? '✓ Safe' : `✗ Blocked: ${reason}`);
```

### See all safety patterns:
```javascript
// View DANGEROUS_PATTERNS in safety.js
// View SAFE_COMMANDS in safety.js
```

### Trace execution flow:
```javascript
// In executor.js, see console.log statements:
// [step/total] Running: command
// ⟳ executing...
// ✓ success or ✗ failed
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Command blocked unexpectedly | Check DANGEROUS_PATTERNS in safety.js |
| Output not showing | Check stdout/stderr capture in executor.js |
| Terminal approval not prompting | Ensure terminalActions array is populated |
| User input not working | Check readline interface in approval.js |
| Output too long | Output is truncated to 500 chars, use `>` in command to save file |

## Performance Notes

- Safety validation is O(n) where n = number of patterns (~20)
- Each command is validated before execution (blocking prevents failures)
- Output truncation limits memory usage for large outputs
- No parallel execution (Phase 3 design: sequential, explicit)

## Security Considerations

- Validation happens before execution (defense in depth)
- Patterns cover common attack vectors (injection, privilege escalation)
- Unknown commands allowed but flagged (trusts user decision)
- No environment variable expansion in validation (exact patterns only)
- Output displayed as-is (no HTML escaping needed for terminal)

## Next Steps (Phase 4)

Future enhancements could include:
- Automatic retry on failure
- AI-powered debugging
- Command history
- Output logging
- Parallel execution
- Advanced dependency detection
