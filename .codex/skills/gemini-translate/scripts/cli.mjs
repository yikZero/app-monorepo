#!/usr/bin/env node

import { helpText, parseArgs } from './lib/args.mjs';
import { redact } from './lib/redact.mjs';

async function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    printError(err);
    process.exit(err.exitCode || 2);
  }

  if (args.help) {
    console.log(helpText());
    return;
  }

  try {
    const { runCli } = await import('./lib/run.mjs');
    await runCli(args);
  } catch (err) {
    printError(err);
    process.exit(err.exitCode || 1);
  }
}

function printError(err) {
  const message = redact(err?.message || String(err));
  console.error(message);
  if (typeof err?.elapsedMs === 'number') {
    console.error(
      `elapsedMs=${err.elapsedMs} attempts=${err.attempts ?? '?'} retries=${err.retries ?? '?'}`,
    );
  }
}

const isDirect =
  Boolean(process.argv[1]) &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isDirect || process.argv[1]?.endsWith('cli.mjs')) {
  main(process.argv.slice(2));
}

export { main };
