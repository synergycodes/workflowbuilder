import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { copyImage } from '../../utils/export-visualization';
import { CopyImageButton } from './copy-image-button';

vi.mock('../../utils/export-visualization', () => ({
  copyImage: vi.fn(),
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

describe('CopyImageButton', () => {
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
    vi.mocked(copyImage).mockReset();
  });

  function render(getTarget: () => HTMLElement | null = () => target) {
    act(() => {
      root.render(<CopyImageButton className="action" getTarget={getTarget} />);
    });
    return container.querySelector('button')!;
  }

  it('shows Copied feedback and reverts after the timeout', async () => {
    vi.mocked(copyImage).mockResolvedValue(true);
    const button = render();
    expect(button.title).toBe('Copy image');

    await click(button);
    expect(copyImage).toHaveBeenCalledWith(target);
    expect(button.title).toBe('Copied');

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(button.title).toBe('Copy image');
  });

  it('shows no feedback when the copy fell back to a download', async () => {
    vi.mocked(copyImage).mockResolvedValue(false);
    const button = render();

    await click(button);
    expect(button.title).toBe('Copy image');
  });

  it('does nothing without a target', async () => {
    const button = render(() => null);

    await click(button);
    expect(copyImage).not.toHaveBeenCalled();
  });
});
