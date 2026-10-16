import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Sidebar } from '../../../../components/sidebar/sidebar';
import { resetWorkflowStore } from '../../../../store/store';
import '../../../i18n/index';
import { registerComponentDecorator } from '../../../plugins-core/adapters/adapter-components';
import { renderInRoot } from '../../../ui-extensions/test-utils';
import { PaletteFooter } from './palette-footer';

const KEEPS_FOOTER_VISIBLE = ':has(> [class*="footer"] > :not(:empty))';

// One decorator name, so each test replaces the previous registration in the global registry.
function renderWithDeprecatedSlotContent(render: () => ReactNode) {
  registerComponentDecorator('OptionalFooterContent', { name: 'deprecated-footer-slot-spec', content: render });
  resetWorkflowStore();
  const result = renderInRoot(
    <Sidebar isExpanded footer={<PaletteFooter onTemplateClick={vi.fn()} />}>
      Content
    </Sidebar>,
    { builtInControls: { templates: false } },
  );
  return result.container.querySelector('[class*="footer-area"]')!;
}

describe('PaletteFooter with the deprecated OptionalFooterContent slot', () => {
  it('bare text from the slot keeps the footer visible', () => {
    const footerArea = renderWithDeprecatedSlotContent(() => 'Beta');

    expect(screen.getByText('Beta')).not.toBeNull();
    expect(footerArea.matches(KEEPS_FOOTER_VISIBLE)).toBe(true);
  });

  it('an <input> from the slot keeps the footer visible', () => {
    const footerArea = renderWithDeprecatedSlotContent(() => <input aria-label="Filter" />);

    expect(screen.getByLabelText('Filter')).not.toBeNull();
    expect(footerArea.matches(KEEPS_FOOTER_VISIBLE)).toBe(true);
  });

  it('a slot that renders nothing leaves the footer hidden', () => {
    const footerArea = renderWithDeprecatedSlotContent(() => null);

    expect(footerArea.matches(KEEPS_FOOTER_VISIBLE)).toBe(false);
  });
});
