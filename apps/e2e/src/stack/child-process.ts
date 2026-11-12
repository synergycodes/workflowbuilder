import { type ChildProcess, spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import path from 'node:path';

type Options = {
  name: string;
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  logDirectory: string;
  /** Text in the output that means the process is ready. Without it, ready means a clean exit. */
  readyText?: string;
  timeoutMs: number;
};

type StackProcess = { name: string; stop: () => Promise<void> };

const STOP_GRACE_MS = 5000;
const running = new Set<ChildProcess>();

function signalGroup(child: ChildProcess, signal: NodeJS.Signals) {
  if (child.pid === undefined) {
    return;
  }
  try {
    // Negative pid: the whole group, because pnpm does not pass a signal on to the script it runs.
    process.kill(-child.pid, signal);
  } catch {
    // The group is already gone.
  }
}

// A runner that exits without teardown (Ctrl-C during setup) must not leave the stack behind.
process.on('exit', () => {
  for (const child of running) {
    signalGroup(child, 'SIGKILL');
  }
});

function stop(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    const forceKill = setTimeout(() => signalGroup(child, 'SIGKILL'), STOP_GRACE_MS);
    child.once('exit', () => {
      clearTimeout(forceKill);
      // The leader can exit before its children do.
      signalGroup(child, 'SIGKILL');
      resolve();
    });
    signalGroup(child, 'SIGTERM');
  });
}

export function startProcess(options: Options): Promise<StackProcess> {
  const { name, command, args, cwd, env, logDirectory, readyText, timeoutMs } = options;
  const logPath = path.join(logDirectory, `${name}.log`);
  const log = createWriteStream(logPath);
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  running.add(child);
  child.once('exit', () => running.delete(child));

  return new Promise((resolve, reject) => {
    let output = '';
    let isSettled = false;

    const fail = (reason: string) => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      clearTimeout(timer);
      void stop(child).then(() => reject(new Error(`${name}: ${reason}. Output: ${logPath}`)));
    };
    const succeed = () => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      clearTimeout(timer);
      output = '';
      resolve({ name, stop: () => stop(child) });
    };

    const timer = setTimeout(
      () => fail(`not ready after ${timeoutMs / 1000}s${readyText ? ` (waited for "${readyText}")` : ''}`),
      timeoutMs,
    );

    const onData = (chunk: Buffer) => {
      log.write(chunk);
      if (isSettled || readyText === undefined) {
        return;
      }
      output += chunk.toString();
      if (output.includes(readyText)) {
        succeed();
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.once('error', (error) => fail(`could not start (${error.message})`));
    child.once('exit', (code, signal) => {
      log.end();
      if (readyText === undefined && code === 0) {
        succeed();
      } else {
        fail(`exited with ${signal ?? `code ${code}`} before it was ready`);
      }
    });
  });
}
