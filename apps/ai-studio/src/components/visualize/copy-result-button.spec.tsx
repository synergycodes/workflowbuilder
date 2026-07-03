import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { copyResult } from '../../utils/export-visualization';
import { CopyResultButton } from './copy-result-button';

vi.mock('../../utils/export-visualization', () => ({
  copyResult: vi.fn(),
}));

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function click(button: HTMLButtonElement) {
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('CopyResultButton', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const target = document.createElement('div');

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.mocked(copyResult).mockReset();
  });

  function render(getTarget: () => HTMLElement | null = () => target) {
    act(() => {
      root.render(<CopyResultButton className="action" getTarget={getTarget} text="raw result" />);
    });
    return container.querySelector('button')!;
  }

  it('shows Copied feedback and reverts after the timeout', async () => {
    vi.mocked(copyResult).mockResolvedValue(true);
    const button = render();
    expect(button.title).toBe('Copy result');

    await click(button);
    expect(copyResult).toHaveBeenCalledWith(target, 'raw result');
    expect(button.title).toBe('Copied');

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(button.title).toBe('Copy result');
  });

  it('shows no feedback when the copy fell back to a download', async () => {
    vi.mocked(copyResult).mockResolvedValue(false);
    const button = render();

    await click(button);
    expect(button.title).toBe('Copy result');
  });

  it('does nothing without a target', async () => {
    const button = render(() => null);

    await click(button);
    expect(copyResult).not.toHaveBeenCalled();
  });
});
