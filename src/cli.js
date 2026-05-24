#!/usr/bin/env node
import { readFile, writeFile, createFolder } from './fs.js';
import { execShell } from './terminal.js';
import { callAI, getProvider } from './ai.js';

function usage() {
  console.log(`
Terminal AI Co-Agent CLI

Usage:
  ai read <path>
  ai write <path> <content>
  ai mkdir <path>
  ai exec <command>
  ai ai "<prompt>"

Environment:
  OPENAI_API_KEY or OPENROUTER_API_KEY
  AI_BASE_URL optionally overrides the provider endpoint
  AI_MODEL optionally chooses the model
`);
}

async function main() {
  const [, , command, ...rest] = process.argv;

  if (!command) {
    usage();
    process.exit(1);
  }

  try {
    switch (command) {
      case 'read': {
        const [filePath] = rest;
        if (!filePath) throw new Error('Missing file path.');
        const content = await readFile(filePath);
        process.stdout.write(content);
        break;
      }
      case 'write': {
        const [filePath, ...contentParts] = rest;
        if (!filePath) throw new Error('Missing file path.');
        if (contentParts.length === 0) throw new Error('Missing content.');
        await writeFile(filePath, contentParts.join(' '));
        console.log(`Wrote ${filePath}`);
        break;
      }
      case 'mkdir': {
        const [folderPath] = rest;
        if (!folderPath) throw new Error('Missing folder path.');
        await createFolder(folderPath);
        console.log(`Created ${folderPath}`);
        break;
      }
      case 'exec': {
        const commandString = rest.join(' ');
        if (!commandString) throw new Error('Missing shell command.');
        const result = await execShell(commandString);
        process.stdout.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
        process.exit(result.code ?? 0);
        break;
      }
      case 'ai': {
        const prompt = rest.join(' ').trim();
        if (!prompt) throw new Error('Missing prompt text.');
        console.log(`Provider: ${getProvider() || 'none'}`);
        const output = await callAI(prompt);
        process.stdout.write(output + '\n');
        break;
      }
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
