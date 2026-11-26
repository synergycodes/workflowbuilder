import { resolveEdgeRunTone } from './resolve-edge-run-tone';

describe('resolveEdgeRunTone', () => {
  it.each([
    ['pending', 'default'],
    ['running', 'active'],
    ['completed', 'success'],
    ['outOfRun', 'disabled'],
  ] as const)('gives %s its default tone %s without a tone', (runState, tone) => {
    expect(resolveEdgeRunTone(runState)).toBe(tone);
  });

  it('takes an explicit tone, a built-in default included', () => {
    expect(resolveEdgeRunTone('completed', 'warning')).toBe('warning');
    expect(resolveEdgeRunTone('running', 'default')).toBe('default');
  });

  it('takes a custom tone name', () => {
    expect(resolveEdgeRunTone('completed', 'error')).toBe('error');
  });

  it.each(['Error', 'my tone', 'a_b', ''])('falls back to the default of the run state for %j', (tone) => {
    expect(resolveEdgeRunTone('completed', tone)).toBe('success');
  });

  it('returns undefined without a run state', () => {
    expect(resolveEdgeRunTone(undefined, 'warning')).toBeUndefined();
    expect(resolveEdgeRunTone()).toBeUndefined();
  });
});
