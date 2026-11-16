import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@workflowbuilder/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { number?: number }) => `${key}:${options?.number ?? ''}`,
  }),
}));

let appBar: { version?: { number: number; isDraft: boolean }; onPublish?: () => void } = {};
vi.mock('../../app-bar-context', () => ({
  useAppBar: () => appBar,
}));

const { PublishButton } = await import('./publish-button');

describe('PublishButton', () => {
  beforeEach(() => {
    appBar = { version: { number: 7, isDraft: true }, onPublish: vi.fn() };
  });

  it('renders nothing without onPublish', () => {
    appBar = { version: { number: 7, isDraft: true } };
    const { container } = render(<PublishButton />);

    expect(container.firstChild).toBeNull();
  });

  it('is enabled for a draft and calls onPublish', () => {
    render(<PublishButton />);
    const button = screen.getByRole('button', { name: 'header.version.publish:7' }) as HTMLButtonElement;

    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(appBar.onPublish).toHaveBeenCalledOnce();
  });

  it('is disabled when the version is published', () => {
    appBar = { version: { number: 7, isDraft: false }, onPublish: vi.fn() };
    render(<PublishButton />);

    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('is disabled without version', () => {
    appBar = { onPublish: vi.fn() };
    render(<PublishButton />);
    const button = screen.getByRole('button', { name: 'header.version.publishNoVersion:' }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
  });

  it('stays enabled in read-only mode', () => {
    render(<PublishButton />);

    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false);
  });
});
