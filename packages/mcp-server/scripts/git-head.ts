import { execFileSync } from 'node:child_process';

import { REPO_ROOT } from '../src/paths.js';

export function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return;
  }
}
