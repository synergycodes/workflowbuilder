// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('ai-studio sources', () => {
  // Reads all of src; took over 5 s next to the jsdom workers.
  it('style no edge through injected CSS or React Flow internals', () => {
    // Built from parts so this file does not match its own needles.
    const needles = [['append', 'CSS'].join(''), ['data', 'edge', 'id'].join('-'), ['!', 'important'].join('')];
    const root = fileURLToPath(new URL('../..', import.meta.url));
    const offenders = readdirSync(root, { recursive: true, encoding: 'utf8' })
      .filter((file) => /\.(tsx?|css)$/.test(file))
      .filter((file) => {
        const source = readFileSync(path.join(root, file), 'utf8');
        return needles.some((needle) => source.includes(needle));
      });

    expect(offenders).toEqual([]);
  }, 30_000);
});
