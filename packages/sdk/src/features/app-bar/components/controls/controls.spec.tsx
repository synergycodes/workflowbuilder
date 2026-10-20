import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@workflowbuilder/ui', () => ({
  Menu: Object.assign(() => <div data-testid="menu" />, { TriggerButton: () => null }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../functions/get-controls-dots-items', () => ({
  getControlsDotsItems: () => [{ label: 'importExport.export' }],
}));

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
  PublishButton: () => null,
}));

const { Controls } = await import('./controls');

describe('Controls', () => {
  it('renders no dots menu', () => {
    render(<Controls />);

    expect(screen.queryByTestId('menu')).toBeNull();
  });
});
