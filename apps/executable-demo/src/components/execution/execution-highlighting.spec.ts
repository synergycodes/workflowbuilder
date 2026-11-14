import { describe, expect, it, vi } from 'vitest';

import { buildExecutionHighlightCss } from './execution-highlighting';

if (!globalThis.CSS) Object.defineProperty(globalThis, 'CSS', { value: {} });
if (!globalThis.CSS.escape) globalThis.CSS.escape = vi.fn((value: string) => value);

describe('buildExecutionHighlightCss', () => {
  it('creates node status and reached-edge selectors', () => {
    const css = buildExecutionHighlightCss(
      { source: { status: 'completed' }, target: { status: 'running' }, skipped: { status: 'skipped' } },
      [
        { id: 'active-edge', source: 'source', target: 'target' },
        { id: 'skipped-edge', source: 'source', target: 'skipped' },
      ],
    );
    expect(css).toContain('active-edge');
    expect(css).not.toContain('skipped-edge');
    expect(css).toContain('--execution-completed');
    expect(css).toContain('--execution-running');
    expect(css).toContain('--execution-skipped');
  });
});
