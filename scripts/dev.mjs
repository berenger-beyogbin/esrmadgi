import { spawn } from 'node:child_process';
import process from 'node:process';

const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmArgs = npmCli ? [npmCli, 'run', 'dev'] : ['run', 'dev'];
const processes = [
  spawn(command, npmArgs, { cwd: 'server', stdio: 'inherit' }),
  spawn(command, npmArgs, { cwd: '.', stdio: 'inherit' }),
];

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
  process.exitCode = exitCode;
}

for (const child of processes) {
  child.on('error', (error) => {
    console.error('[dev] Impossible de demarrer un service :', error.message);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping && code !== 0) {
      console.error(`[dev] Un service s'est arrete (${signal ?? `code ${code}`}).`);
      stop(code ?? 1);
    }
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
