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

let isEmpty = false;
vi.mock('../../../../store/store', () => ({
  useStore: <T,>(selector: (state: { nodes: unknown[] }) => T) => selector({ nodes: isEmpty ? [] : [{}] }),
}));

let appBar: { version?: { number: number; isDraft: boolean } } = {};
vi.mock('../../app-bar-context', () => ({
  useAppBar: () => appBar,
}));

const { VersionChip } = await import('./version-chip');

describe('VersionChip', () => {
  beforeEach(() => {
    isEmpty = false;
    appBar = { version: { number: 7, isDraft: true } };
  });

  it('shows the draft label when isDraft', () => {
    render(<VersionChip />);

    expect(screen.getByText('header.version.draft:7')).toBeTruthy();
  });

  it('shows the published label otherwise', () => {
    appBar = { version: { number: 7, isDraft: false } };
    render(<VersionChip />);

    expect(screen.getByText('header.version.published:7')).toBeTruthy();
  });

  it('renders nothing without version', () => {
    appBar = {};
    const { container } = render(<VersionChip />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on an empty canvas', () => {
    isEmpty = true;
    const { container } = render(<VersionChip />);

    expect(container.firstChild).toBeNull();
  });
});
