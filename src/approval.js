import readline from 'readline';

export function formatApprovalPlan(plan) {
  const lines = [];
  lines.push('PLAN', '');
  lines.push('Goal:');
  lines.push(plan.goal || 'No goal provided.');
  lines.push('');
  lines.push('Proposed actions:', '');

  lines.push(formatSection('CREATE', plan.proposedActions.create));
  lines.push(formatSection('EDIT', plan.proposedActions.edit));
  lines.push(formatSection('INSTALL', plan.proposedActions.install));
  lines.push(formatSection('COMMANDS', plan.proposedActions.commands));

  lines.push('Changed files:', '');
  if (plan.changedFiles && plan.changedFiles.length > 0) {
    plan.changedFiles.forEach((file) => lines.push(`- ${file}`));
  } else {
    lines.push('- none');
  }
  lines.push('');

  lines.push('Reasoning:');
  lines.push(plan.reasoning || 'No reasoning provided.');
  lines.push('');
  lines.push('Proceed? (y/n)');
  return lines.join('\n');
}

function formatSection(label, items = []) {
  const section = [`[${label}]`];
  if (items.length === 0) {
    section.push('- none');
  } else {
    items.forEach((item) => section.push(`- ${item}`));
  }
  section.push('');
  return section.join('\n');
}

export function requestApproval() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('> ', (answer) => {
      rl.close();
      resolve(parseApprovalResponse(answer));
    });
  });
}

function parseApprovalResponse(value) {
  if (!value) {
    return { approved: false, valid: false };
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'y' || normalized === 'yes') {
    return { approved: true, valid: true };
  }
  if (normalized === 'n' || normalized === 'no') {
    return { approved: false, valid: true };
  }
  return { approved: false, valid: false };
}

export async function promptApproval() {
  let response = await requestApproval();

  while (!response.valid) {
    console.log('Please answer with y / yes or n / no.');
    response = await requestApproval();
  }

  return response.approved;
}

// Phase 3: Terminal command approval helpers

export function formatTerminalApprovalPlan(commands) {
  const lines = [];
  
  if (commands.length === 0) {
    return '';
  }

  lines.push('');
  lines.push('TERMINAL ACTIONS REQUIRED');
  lines.push('');
  lines.push('Commands proposed:');
  lines.push('');

  commands.forEach((cmd, index) => {
    lines.push(`[${index + 1}]`);
    lines.push(cmd.command);
    if (cmd.category) {
      lines.push(`Category: ${cmd.category}`);
    }
    lines.push('');
  });

  lines.push('Proceed with terminal commands? (y/n)');
  return lines.join('\n');
}

export async function promptTerminalApproval() {
  let response = await requestApproval();

  while (!response.valid) {
    console.log('Please answer with y / yes or n / no.');
    response = await requestApproval();
  }

  return response.approved;
}
