import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Sidebar } from '../../../../components/sidebar/sidebar';
import { resetWorkflowStore } from '../../../../store/store';
import '../../../i18n/index';
import { renderInRoot } from '../../../ui-extensions/test-utils';
import { PaletteFooter } from './palette-footer';

function renderInSidebar(builtInControls?: { templates?: boolean }) {
  resetWorkflowStore();
  return renderInRoot(
    <Sidebar isExpanded footer={<PaletteFooter onTemplateClick={vi.fn()} />}>
      Content
    </Sidebar>,
    { builtInControls },
  );
}

describe('PaletteFooter builtInControls', () => {
  it('templates:false hides the Templates button; true (the default) shows it', () => {
    const { unmount } = renderInSidebar({ templates: false });
    expect(screen.queryByText('Templates')).toBeNull();
    unmount();

    renderInSidebar({ templates: true });
    expect(screen.getByText('Templates')).not.toBeNull();
  });

  it('templates:false with no other footer content leaves a footer wrapper that the Sidebar :has() rule hides', () => {
    const { container } = renderInSidebar({ templates: false });

    const footerArea = container.querySelector('[class*="footer-area"]');
    expect(footerArea).not.toBeNull();
    expect(footerArea!.matches(':has(> [class*="footer"] > :not(:empty))')).toBe(false);
  });

  it('templates:true shows footer content, so the wrapper matches the keep-visible selector', () => {
    const { container } = renderInSidebar({ templates: true });

    const footerArea = container.querySelector('[class*="footer-area"]');
    expect(footerArea!.matches(':has(> [class*="footer"] > :not(:empty))')).toBe(true);
  });
});
