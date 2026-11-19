import { readFileSync } from 'node:fs';
import path from 'node:path';

import { runStatusPresets } from './run-status-presets';

const presets = Object.entries(runStatusPresets);

// Never called: `pnpm typecheck` fails if the presets become assignable.
function _assignLabel() {
  // @ts-expect-error label is read-only
  runStatusPresets.running.badge.label = 'Busy';
}

describe('runStatusPresets', () => {
  it('gives a halo only to the tones that have a DS halo colour', () => {
    for (const [, { ring }] of presets) {
      if (ring.halo) expect(['info', 'warning', 'human']).toContain(ring.tone);
    }
  });

  it('writes every label in sentence case', () => {
    const labels = presets.map(([, { badge }]) => badge.label);

    expect(labels).toEqual(labels.map((label) => label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()));
  });
});

describe('the Statuses table of the run status docs page', () => {
  const page = path.resolve(
    import.meta.dirname,
    '../../../../../../apps/docs/src/content/docs/ui-library/diagram-components/run-status.mdx',
  );
  const table = readFileSync(page, 'utf8').split('## Statuses')[1]!.split('\n## ')[0]!;
  const rows = table
    .split('\n')
    .filter((line) => line.startsWith('| ') && line.includes('`'))
    .map((line) => line.split('|').map((cell) => cell.trim()));

  it('has one row per preset with its ring, indicator and badge tones', () => {
    // cells: '' (before the first pipe), Status, Key, Ring, Indicator, Badge
    const documented = rows.map((cells) => [
      cells[2]!.replaceAll('`', ''),
      cells[3]!.split(',')[0],
      cells[4]!.split(',')[0],
      cells[5]!.split(',')[0],
    ]);

    expect(documented).toEqual(
      presets.map(([key, { ring, indicator, badge }]) => [key, ring.tone, indicator?.tone ?? 'none', badge.tone]),
    );
  });
});
