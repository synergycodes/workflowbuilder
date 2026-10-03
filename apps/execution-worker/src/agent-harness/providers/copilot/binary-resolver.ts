/**
 * Copilot CLI binary resolver.
 *
 * Trimmed from Archon's 6-step resolution chain (env → config → vendor dir →
 * npm-prefix autodetect → PATH → throw), which exists to solve binary
 * resolution inside `bun --compile` compiled binaries. workflowbuilder's
 * execution worker is a normal Node/Docker process, so the vendor-dir and
 * autodetect steps (host-architecture-specific, not applicable here) are
 * dropped. See PORTING-MAP.md §4.3 / adaptation A4.
 *
 * Resolution order:
 *  1. `COPILOT_CLI_PATH` environment variable
 *  2. `assistants.copilot.copilotCliPath` in config
 *  3. PATH lookup via `which` / `where`
 *  4. Throw with install instructions
 */
import { execFileSync } from 'node:child_process';
import { accessSync, constants as fsConstants } from 'node:fs';

import { appendBinaryCandidateHint, classifyBinaryPath } from '../../shared/binary-resolution';

/**
 * Resolve `copilot` via the OS path lookup (`which` / `where`). Wrapper is
 * exported so tests can spy on it without spawning real subprocesses.
 * Returns the first hit on PATH, or undefined when the lookup yields nothing
 * or fails (the lookup tool itself missing, etc.).
 */
export function resolveFromPath(): string | undefined {
  const lookupCmd = process.platform === 'win32' ? 'where' : 'which';
  // 'where copilot' (no .exe) resolves npm shims (.cmd) and .exe; 'copilot.exe' alone misses them.
  const executable = 'copilot';
  try {
    const output = execFileSync(lookupCmd, [executable], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const first = output.split(/\r?\n/)[0]?.trim();
    return first || undefined;
  } catch {
    return undefined;
  }
}

/**
 * True if `path` is a regular file the current user can execute. On win32,
 * Node's `stat.mode` does not track Unix exec bits, so we fall back to
 * "is a file" — which matches how `where` / `PATH` resolution works there.
 *
 * Use for env- and config-supplied paths so a user pointing at a directory
 * or a non-executable file fails loudly at resolve time, before the SDK
 * tries to spawn it.
 */
export function isExecutableFile(path: string): boolean {
  const kind = classifyBinaryPath(path, () => {
    /* an unexpected stat error (e.g. EACCES on a parent dir) still counts as not-executable here */
  });
  if (kind !== 'file') return false;
  if (process.platform === 'win32') return true;
  try {
    // accessSync(X_OK) checks current-user executability — `mode & 0o111`
    // alone proves *some* exec bit exists (e.g., mode 001 fails for owner).
    accessSync(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the path to the Copilot CLI binary. Returns undefined only when
 * every step is skipped (never in practice — the PATH lookup step always
 * runs); a resolvable install always ends in a validated path or a throw.
 */
export async function resolveCopilotBinaryPath(configCliPath?: string): Promise<string | undefined> {
  // 1. Environment variable override
  const envPath = process.env.COPILOT_CLI_PATH;
  if (envPath) {
    if (!isExecutableFile(envPath)) {
      throw new Error(
        `COPILOT_CLI_PATH is set to "${envPath}" but it is not an executable file.\n` +
          'Verify the path points to the Copilot CLI executable (chmod +x if needed).',
      );
    }
    return envPath;
  }

  // 2. Config file override
  if (configCliPath) {
    if (!isExecutableFile(configCliPath)) {
      throw new Error(
        `assistants.copilot.copilotCliPath is set to "${configCliPath}" but it is not an executable file.\n` +
          'Verify the configured path points to the Copilot CLI executable (chmod +x if needed).',
      );
    }
    return configCliPath;
  }

  // 3. PATH lookup via which/where. Validate with isExecutableFile so a stale
  // shim doesn't hand back a non-executable path.
  const fromPath = resolveFromPath();
  if (fromPath && isExecutableFile(fromPath)) {
    return fromPath;
  }

  // 4. Not found — throw with install instructions.
  const baseMessage =
    'Copilot CLI binary not found. The Copilot provider requires the\n' +
    '@github/copilot CLI.\n\n' +
    'To fix, choose one of:\n' +
    '  1. Install globally: npm install -g @github/copilot\n' +
    '     Then set: COPILOT_CLI_PATH=$(which copilot)\n\n' +
    '  2. Set the path in provider config:\n' +
    '     assistants:\n' +
    '       copilot:\n' +
    '         copilotCliPath: /path/to/copilot\n';
  throw new Error(
    appendBinaryCandidateHint(baseMessage, {
      candidatePath: fromPath,
      binaryLabel: 'copilot',
      sourceLabel: 'COPILOT_CLI_PATH',
      removableSetting: 'copilotCliPath',
    }),
  );
}
