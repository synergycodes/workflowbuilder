import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../plugins-core/components/app/optional-app-bar-controls', () => ({
  OptionalAppBarControls: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../toggle-dark-mode/toggle-dark-mode', () => ({
  ToggleDarkMode: () => null,
}));

vi.mock('../toggle-read-only-mode/toggle-read-only-mode', () => ({
  ToggleReadyOnlyMode: () => null,
}));

vi.mock('../clean-up-button/clean-up-button', () => ({
  CleanUpButton: () => null,
}));

vi.mock('../publish-button/publish-button', () => ({
  PublishButton: () => <button>publish</button>,
}));

vi.mock('../more-menu/more-menu', () => ({
  MoreMenu: () => <div data-testid="more-menu" />,
}));

const { Controls } = await import('./controls');

describe('Controls', () => {
  it('renders the More menu inside the controls segment, before Publish', () => {
    render(<Controls />);

    const more = screen.getByTestId('more-menu');
    const publish = screen.getByRole('button', { name: 'publish' });
    expect(more.parentElement).not.toBe(publish.parentElement);
    expect(more.compareDocumentPosition(publish) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
