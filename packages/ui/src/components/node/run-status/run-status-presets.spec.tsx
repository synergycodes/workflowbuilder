import { runStatusPresets } from './run-status-presets';

const presets = Object.entries(runStatusPresets);

// Never called: `pnpm typecheck` fails if the presets become assignable.
function assignLabel() {
  // @ts-expect-error label is read-only
  runStatusPresets.running.badge.label = 'Busy';
}

describe('runStatusPresets', () => {
  it('gives a halo only to the tones that have a DS halo colour', () => {
    for (const [, { ring }] of presets) {
      if (ring.halo) expect(['info', 'warning', 'human']).toContain(ring.tone);
    }
  });

  it.each(presets)('%s has a sentence-case label', (_, { badge }) => {
    expect(badge.label).toBe(badge.label.charAt(0).toUpperCase() + badge.label.slice(1).toLowerCase());
  });

  it.each(presets.filter(([status]) => status !== 'skipped'))('%s has an indicator', (_, { indicator }) => {
    expect(indicator).toBeDefined();
  });

  it.each(presets.filter(([, { indicator }]) => indicator?.spinner))(
    '%s pairs its spinner with a static halo',
    (_, { ring }) => {
      expect(ring.halo).toBe('static');
    },
  );

  it.each(presets.filter(([, { indicator }]) => indicator?.iconTone))(
    '%s sets iconTone only where it differs from the indicator tone',
    (_, { indicator }) => {
      expect(indicator?.iconTone).not.toBe(indicator?.tone);
    },
  );

  it('is read-only to consumers', () => {
    expect(assignLabel).toBeTypeOf('function');
  });
});
