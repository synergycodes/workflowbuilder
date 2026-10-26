import { fireEvent, screen } from '@testing-library/react';
import i18n from 'i18next';
import { describe, expect, it, vi } from 'vitest';

import { Sidebar } from '../../../../components/sidebar/sidebar';
import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { resetWorkflowStore } from '../../../../store/store';
import '../../../i18n/index';
import { useModalStore } from '../../../modals/stores/use-modal-store';
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

// Calls the action directly, bypassing the footer's own Templates button.
function OpenTemplatesButton() {
  const { openTemplates } = useWorkflowBuilderActions();
  return (
    <button type="button" onClick={openTemplates}>
      Open templates
    </button>
  );
}

describe('PaletteFooter builtInControls', () => {
  it('templates:false keeps openTemplates working', () => {
    resetWorkflowStore();
    useModalStore.setState({ isOpen: false, modal: null });
    renderInRoot(
      <>
        <OpenTemplatesButton />
        <Sidebar isExpanded footer={<PaletteFooter onTemplateClick={vi.fn()} />}>
          Content
        </Sidebar>
      </>,
      { builtInControls: { templates: false } },
    );
    expect(screen.queryByText('Templates')).toBeNull();

    fireEvent.click(screen.getByText('Open templates'));

    const { isOpen, modal } = useModalStore.getState();
    expect(isOpen).toBe(true);
    expect(modal?.title).toBe(i18n.t('templateSelector.title'));
  });

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
