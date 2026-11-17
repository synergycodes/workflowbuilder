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
