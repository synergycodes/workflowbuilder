import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SdkSurfacesProvider } from '../../../../workflow-builder-root/sdk-surfaces';
import { OverlayAttribute } from './overlay-attribute';

describe('OverlayAttribute', () => {
  it('sets data-wb-overlay on the root while mounted and clears it on unmount', () => {
    const root = document.createElement('div');
    const { unmount } = render(
      <SdkSurfacesProvider value={{ root: { current: root }, portal: null }}>
        <OverlayAttribute kind="variable-picker" />
      </SdkSurfacesProvider>,
    );

    expect(root.dataset.wbOverlay).toBe('variable-picker');

    unmount();

    expect(root.dataset.wbOverlay).toBeUndefined();
  });

  it('renders outside <WorkflowBuilder.Root> without throwing', () => {
    expect(() => render(<OverlayAttribute kind="variable-picker" />)).not.toThrow();
  });
});
