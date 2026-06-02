// Phase 3: Comprehensive safety validation for terminal commands
// Blocks dangerous patterns to prevent accidental data loss

// Absolute blocklist - these patterns are always dangerous
const DANGEROUS_PATTERNS = [
  // Destructive operations
  /\brm\b/i,                          // rm command
  /\brm\s+-rf/i,                      // rm -rf
  /\brm\s+-r/i,                       // rm -r
  /\brmdir\b/i,                       // rmdir
  /\bdd\s+if=.*of=/i,                 // dd (disk destruction)
  /\bmkfs\b/i,                        // mkfs (filesystem wipe)
  
  // Privilege escalation
  /\bsudo\b/i,                        // sudo
  /\bsudu\b/i,                        // typo variant
  
  // System control
  /\bshutdown\b/i,                    // shutdown
  /\breboot\b/i,                      // reboot
  /\bhalt\b/i,                        // halt
  /\bkillall\b/i,                     // killall (broad process kill)
  /\bpoweroff\b/i,                    // poweroff
  
  // Permission changes on system paths
  /\bchmod\s+-R.*\//i,                // chmod -R on system paths
  /\bchown\s+-R.*\//i,                // chown -R on system paths
  
  // Pipe to executable patterns (shell injection)
  /\|\s*bash\b/i,                     // pipe to bash
  /\|\s*sh\b/i,                       // pipe to sh
  /\|\s*python\b/i,                   // pipe to python
  /\|\s*node\b/i,                     // pipe to node
  /\|\s*curl\b/i,                     // pipe to curl
  /\|\s*wget\b/i,                     // pipe to wget
  /;\s*bash\b/i,                      // semicolon to bash
  /;\s*sh\b/i,                        // semicolon to sh
  /`[^`]*rm\b/i,                      // rm inside backticks
  /\$\([^)]*rm\b/i,                   // rm inside $()
  
  // Redirect to system areas
  />\s*\/etc\//i,                     // redirect to /etc
  />\s*\/usr\//i,                     // redirect to /usr
  />\s*\/sys\//i,                     // redirect to /sys
  />\s*\/proc\//i,                    // redirect to /proc
  
  // Motion to critical paths
  /\bmv\s+.*\s+\//i,                  // mv to root
  /\bcp\s+.*\s+\//i,                  // cp to root
  
  // Known injection patterns
  /\$\{.*\}/,                         // variable expansion in suspicious context
  /`;.*`/,                            // backtick execution
];

// Safe command patterns - npm, node, git, npm test, etc
const SAFE_COMMANDS = [
  /^npm\s+(install|test|run|start|build|list)/i,
  /^node\s+/i,
  /^npx\s+/i,
  /^git\s+/i,
  /^yarn\s+/i,
  /^pnpm\s+/i,
  /^ls\b/i,
  /^cat\b/i,
  /^cd\b/i,
  /^pwd\b/i,
  /^echo\b/i,
  /^mkdir\b/i,
  /^touch\b/i,
  /^find\b/i,
  /^grep\b/i,
  /^curl\s+http/i,                   // curl with http (not piped)
  /^wget\s+http/i,                   // wget with http (not piped)
];

export class CommandSafetyResult {
  constructor(command, safe, reason, isSuspicious = false) {
    this.command = command;
    this.safe = safe;
    this.reason = reason;
    this.isSuspicious = isSuspicious;
  }
}

export function validateShellCommand(command) {
  const result = analyzeShellCommand(command);
  
  if (!result.safe) {
    throw new Error(`BLOCKED COMMAND:\n${result.command}\n\nReason:\n${result.reason}`);
  }
  
  return true;
}

export function analyzeShellCommand(command) {
  const normalized = command.trim();
  
  if (!normalized) {
    return new CommandSafetyResult(command, false, 'Empty command');
  }
  
  // Check dangerous patterns first
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(normalized)) {
      return new CommandSafetyResult(
        command,
        false,
        'Unsafe operation - command matches dangerous pattern'
      );
    }
  }
  
  // Check if command looks safe
  const isSafe = SAFE_COMMANDS.some(pattern => pattern.test(normalized));
  
  if (isSafe) {
    return new CommandSafetyResult(command, true, 'Safe command');
  }
  
  // Unknown commands are allowed but flagged as suspicious
  return new CommandSafetyResult(
    command,
    true,
    'Unknown command - verify before execution',
    true  // isSuspicious
  );
}

export function classifyCommand(command) {
  const result = analyzeShellCommand(command);
  return {
    command: result.command,
    safe: result.safe,
    suspicious: result.isSuspicious,
    reason: result.reason
  };
}
