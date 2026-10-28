import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setAppBarBranding } from '../../../../data/app-bar-branding';
import { useWorkflowBuilderActions } from '../../../../hooks/use-workflow-builder-actions';
import { resetWorkflowStore } from '../../../../store/store';
import type { OnSave } from '../../../../types/integration';
import '../../../i18n/index';
import { IntegrationContextWrapper } from '../../../integration/components/integration-variants/context/integration-context-wrapper';
import { useIntegrationStore } from '../../../integration/stores/use-integration-store';
import { renderInRoot } from '../../../ui-extensions/test-utils';
import { Toolbar } from './toolbar';

vi.mock('../../../../assets/workflow-builder-logo.svg?react', () => ({
  default: () => <svg data-testid="built-in-logo" />,
}));

afterEach(() => {
  setAppBarBranding({});
});

describe('Toolbar branding', () => {
  it('renders the built-in logo by default', () => {
    render(<Toolbar />);

    expect(screen.getByTestId('built-in-logo')).toBeTruthy();
  });

  it('renders a custom logo wrapped in a link when branding is set', () => {
    setAppBarBranding({ logo: <img alt="Acme" />, logoHref: 'https://acme.test' });

    render(<Toolbar />);

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://acme.test');
    expect(screen.getByAltText('Acme')).toBeTruthy();
    expect(screen.queryByTestId('built-in-logo')).toBeNull();
  });

  it('treats a string logo as an image URL', () => {
    setAppBarBranding({ logo: '/brand.svg' });

    const { container } = render(<Toolbar />);

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/brand.svg');
  });

  it('renders both theme variants for a light/dark logo', () => {
    setAppBarBranding({ logo: { light: '/brand-light.svg', dark: '/brand-dark.svg' } });

    const { container } = render(<Toolbar />);

    const sources = Array.from(container.querySelectorAll('img'), (img) => img.getAttribute('src'));
    expect(sources).toEqual(['/brand-light.svg', '/brand-dark.svg']);
  });
});

// Calls the action directly, bypassing the toolbar's own Save button.
function SaveNowButton() {
  const { save } = useWorkflowBuilderActions();
  return (
    <button type="button" onClick={() => void save()}>
      Save now
    </button>
  );
}

function renderToolbar(onSave: OnSave, save?: boolean) {
  resetWorkflowStore();
  // As after the initial load: saves are refused while the status is still 'disabled'.
  useIntegrationStore.setState({ savingStatus: 'waiting', lastSaveAttemptTimestamp: Date.now() });
  return renderInRoot(
    <IntegrationContextWrapper onSave={onSave} autoSave>
      <SaveNowButton />
      <Toolbar />
    </IntegrationContextWrapper>,
    { builtInControls: { save } },
  );
}

describe('Toolbar builtInControls', () => {
  it('save:false hides the Save button; true (the default) shows it', () => {
    const { unmount } = renderToolbar(
      vi.fn<OnSave>(async () => 'success'),
      false,
    );
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    unmount();

    renderToolbar(
      vi.fn<OnSave>(async () => 'success'),
      true,
    );
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeNull();
  });

  it('save:false keeps the save action working', () => {
    const onSave = vi.fn<OnSave>(async () => 'success');
    renderToolbar(onSave, false);

    fireEvent.click(screen.getByText('Save now'));

    expect(onSave).toHaveBeenCalledWith({ isAutoSave: false });
  });
});
