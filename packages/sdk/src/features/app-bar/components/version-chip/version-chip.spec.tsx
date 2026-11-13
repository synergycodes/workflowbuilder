import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@workflowbuilder/ui', () => ({
  Chip: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { number?: number }) => `${key}:${options?.number ?? ''}`,
  }),
}));

let version: { number: number; isDraft: boolean } | undefined;
vi.mock('../../../ui-extensions/ui-extension-context', () => ({
  useHeaderSupply: () => version,
}));

let isVisible = true;
vi.mock('../../../ui-extensions/built-in-controls-context', () => ({
  useIsBuiltInControlVisible: () => isVisible,
}));

const { VersionChip } = await import('./version-chip');

describe('VersionChip', () => {
  beforeEach(() => {
    version = { number: 7, isDraft: true };
    isVisible = true;
  });

  it('shows the draft label when isDraft', () => {
    render(<VersionChip />);

    expect(screen.getByText('header.version.draft:7')).toBeTruthy();
  });

  it('shows the published label otherwise', () => {
    version = { number: 7, isDraft: false };
    render(<VersionChip />);

    expect(screen.getByText('header.version.published:7')).toBeTruthy();
  });

  it('renders nothing while no version is supplied', () => {
    version = undefined;
    const { container } = render(<VersionChip />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the version key is false', () => {
    isVisible = false;
    const { container } = render(<VersionChip />);

    expect(container.firstChild).toBeNull();
  });
});
