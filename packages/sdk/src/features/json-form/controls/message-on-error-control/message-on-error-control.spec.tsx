import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@workflow-builder/icons', () => ({ Icon: () => null }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => `t:${key}`, i18n: { exists: (key: string) => key === 'known.key' } }),
}));

vi.mock('../../utils/rendering', () => ({
  createControlRenderer: (_type: string, renderer: unknown) => ({ tester: undefined, renderer }),
}));

const { messageOnErrorControlRenderer } = await import('./message-on-error-control');

const Control = messageOnErrorControlRenderer.renderer as unknown as React.ComponentType<Record<string, unknown>>;

function renderControl(errors: string, text?: string) {
  return render(
    <Control errors={errors} visible={true} uischema={{ type: 'MessageOnError', scope: '#/properties/x', text }} />,
  );
}

describe('MessageOnErrorControl', () => {
  it('shows a plain-sentence text instead of the error', () => {
    renderControl('is required', 'Connect a previous node first.');

    expect(screen.getByText('Connect a previous node first.')).toBeTruthy();
    expect(screen.queryByText('is required')).toBeNull();
  });

  it('shows the translation of a text that is a known key', () => {
    renderControl('is required', 'known.key');

    expect(screen.getByText('t:known.key')).toBeTruthy();
  });

  it('shows the error when no text is set', () => {
    renderControl('is required');

    expect(screen.getByText('is required')).toBeTruthy();
  });

  it('renders nothing without an error', () => {
    const { container } = renderControl('', 'Connect a previous node first.');

    expect(container.innerHTML).toBe('');
  });
});
