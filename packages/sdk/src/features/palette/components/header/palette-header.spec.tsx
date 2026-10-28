import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { resetWorkflowStore } from '../../../../store/store';
import '../../../i18n/index';
import { renderInRoot } from '../../../ui-extensions/test-utils';
import { PaletteContainer } from '../../palette-container';
import { PaletteHeader } from './palette-header';

// Calls the action directly, bypassing the header's own toggle button.
function ExpandPaletteButton() {
  const { setPaletteOpen } = useWorkflowBuilderActions();
  return (
    <button type="button" onClick={() => setPaletteOpen(true)}>
      Expand
    </button>
  );
}

describe('PaletteHeader builtInControls', () => {
  it('paletteToggle:false hides the open/close button; true (the default) shows it', () => {
    const { unmount } = renderInRoot(<PaletteHeader onClick={vi.fn()} isPaletteOpen={false} />, {
      builtInControls: { paletteToggle: false },
    });
    expect(screen.queryByRole('button')).toBeNull();
    unmount();

    renderInRoot(<PaletteHeader onClick={vi.fn()} isPaletteOpen={false} />, {
      builtInControls: { paletteToggle: true },
    });
    expect(screen.getByRole('button', { name: 'Open palette' })).not.toBeNull();
  });

  it('paletteToggle:false plus setPaletteOpen(true) expands the palette', () => {
    resetWorkflowStore();

    renderInRoot(
      <>
        <ExpandPaletteButton />
        <PaletteContainer />
      </>,
      { builtInControls: { paletteToggle: false } },
    );

    // Collapsed: the toggle is gone and the palette has not been expanded yet.
    expect(screen.queryByRole('button', { name: /palette/i })).toBeNull();
    expect(screen.queryByText('Templates')).toBeNull();

    fireEvent.click(screen.getByText('Expand'));

    // The hidden toggle never blocked the action: the palette is now expanded.
    expect(screen.getByText('Templates')).not.toBeNull();
  });
});
