import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import * as resolver from './binary-resolver';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

const mockedExecFileSync = vi.mocked(execFileSync);

describe('resolveCopilotBinaryPath', () => {
  const originalEnv = process.env.COPILOT_CLI_PATH;
  let workDirectory: string;

  beforeEach(() => {
    delete process.env.COPILOT_CLI_PATH;
    workDirectory = mkdtempSync(path.join(tmpdir(), 'agent-harness-copilot-'));
    mockedExecFileSync.mockReset();
  });

  afterEach(() => {
    rmSync(workDirectory, { recursive: true, force: true });
    if (originalEnv === undefined) {
      delete process.env.COPILOT_CLI_PATH;
    } else {
      process.env.COPILOT_CLI_PATH = originalEnv;
    }
  });

  function makeExecutable(name: string): string {
    const filePath = path.join(workDirectory, name);
    writeFileSync(filePath, '#!/bin/sh\necho hi\n');
    chmodSync(filePath, 0o755);
    return filePath;
  }

  function makeNonExecutable(name: string): string {
    const filePath = path.join(workDirectory, name);
    writeFileSync(filePath, 'not executable');
    chmodSync(filePath, 0o644);
    return filePath;
  }

  test('uses COPILOT_CLI_PATH env var when set and file is executable', async () => {
    const binPath = makeExecutable('copilot-env');
    process.env.COPILOT_CLI_PATH = binPath;

    await expect(resolver.resolveCopilotBinaryPath()).resolves.toBe(binPath);
    // Env var wins outright — the PATH lookup must never run.
    expect(mockedExecFileSync).not.toHaveBeenCalled();
  });

  test('throws when COPILOT_CLI_PATH is set but path is not executable', async () => {
    const binPath = makeNonExecutable('copilot-env-bad');
    process.env.COPILOT_CLI_PATH = binPath;

    await expect(resolver.resolveCopilotBinaryPath()).rejects.toThrow('is not an executable file');
  });

  test('throws when COPILOT_CLI_PATH points at a directory, not a file', async () => {
    process.env.COPILOT_CLI_PATH = workDirectory;

    await expect(resolver.resolveCopilotBinaryPath()).rejects.toThrow('is not an executable file');
  });

  test('uses config cliPath when file is executable', async () => {
    const binPath = makeExecutable('copilot-config');

    await expect(resolver.resolveCopilotBinaryPath(binPath)).resolves.toBe(binPath);
    expect(mockedExecFileSync).not.toHaveBeenCalled();
  });

  test('throws when config cliPath is not executable', async () => {
    const binPath = makeNonExecutable('copilot-config-bad');

    await expect(resolver.resolveCopilotBinaryPath(binPath)).rejects.toThrow('is not an executable file');
  });

  test('falls back to PATH lookup when env and config are unset', async () => {
    const binPath = makeExecutable('copilot-on-path');
    mockedExecFileSync.mockReturnValue(`${binPath}\n`);

    await expect(resolver.resolveCopilotBinaryPath()).resolves.toBe(binPath);
  });

  test('throws with install instructions when nothing resolves', async () => {
    mockedExecFileSync.mockImplementation(() => {
      throw new Error('which: not found');
    });

    await expect(resolver.resolveCopilotBinaryPath()).rejects.toThrow('Copilot CLI binary not found');
  });

  test('appends a candidate hint when PATH found a non-executable stale shim', async () => {
    const stalePath = path.join(workDirectory, 'stale-shim');
    // Never created on disk — classifyBinaryPath resolves it as 'missing',
    // so isExecutableFile is false and the candidate hint fires.
    mockedExecFileSync.mockReturnValue(`${stalePath}\n`);

    await expect(resolver.resolveCopilotBinaryPath()).rejects.toThrow(stalePath);
  });
});

describe('isExecutableFile', () => {
  test('returns false for a directory rather than a file', () => {
    // The real footgun this guards against: a user-supplied path that
    // resolves to a directory must fail loudly instead of being handed to
    // the SDK as a spawn target.
    expect(resolver.isExecutableFile('/tmp')).toBe(false);
  });

  test('returns false for a missing path', () => {
    expect(resolver.isExecutableFile('/nonexistent/path/to/copilot')).toBe(false);
  });
});
