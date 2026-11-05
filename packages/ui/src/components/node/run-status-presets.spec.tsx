import { runStatusPresets } from './run-status-presets';

describe('runStatusPresets', () => {
  it('covers the thirteen design-system statuses', () => {
    expect(Object.keys(runStatusPresets)).toHaveLength(13);
  });

  it('lets a status mix tones across its parts', () => {
    const { incomplete, rejected } = runStatusPresets;

    expect(incomplete.ring.tone).toBe('success');
    expect(incomplete.badge.tone).toBe('warning');
    expect(rejected.ring.tone).toBe('inverse');
    expect(rejected.indicator).toMatchObject({ tone: 'neutral', iconTone: 'inverse' });
  });

  it('gives a halo only to the tones that have a halo colour', () => {
    for (const { ring } of Object.values(runStatusPresets)) {
      if (ring.halo) expect(['info', 'warning', 'human']).toContain(ring.tone);
    }
  });

  it('veils a skipped step and shows no indicator for it', () => {
    const { skipped } = runStatusPresets;

    expect(skipped.veil).toBe(true);
    expect(skipped.indicator).toBeUndefined();
    expect(skipped.badge.dimmed).toBe(true);
  });
});
