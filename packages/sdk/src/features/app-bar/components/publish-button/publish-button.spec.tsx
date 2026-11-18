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

let supplies: { version?: { number: number; isDraft: boolean }; publish?: () => void } = {};
let isVisible = true;
vi.mock('../../../ui-extensions/ui-extension-context', () => ({
  useHeaderSupply: (kind: keyof typeof supplies) => supplies[kind],
  useIsHeaderControlShown: (kind: keyof typeof supplies) => isVisible && supplies[kind] !== undefined,
}));

const actions = { publish: vi.fn() };
vi.mock('../../../../hooks/use-workflow-builder-actions', () => ({
  useWorkflowBuilderActions: () => actions,
}));

const { PublishButton } = await import('./publish-button');

describe('PublishButton', () => {
  beforeEach(() => {
    supplies = { version: { number: 7, isDraft: true }, publish: vi.fn() };
    isVisible = true;
    actions.publish = vi.fn();
  });

  it('renders nothing while Publish is not supplied', () => {
    supplies = { version: { number: 7, isDraft: true } };
    const { container } = render(<PublishButton />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the publish key is false', () => {
    isVisible = false;
    const { container } = render(<PublishButton />);

    expect(container.firstChild).toBeNull();
  });

  it('is enabled for a draft and runs the publish action', () => {
    render(<PublishButton />);
    const button = screen.getByRole('button', { name: 'header.version.publish:7' }) as HTMLButtonElement;

    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(actions.publish).toHaveBeenCalledOnce();
  });

  it('is disabled when the version is published', () => {
    supplies = { version: { number: 7, isDraft: false }, publish: vi.fn() };
    render(<PublishButton />);

    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('is disabled without version', () => {
    supplies = { publish: vi.fn() };
    render(<PublishButton />);
    const button = screen.getByRole('button', { name: 'header.version.publishNoVersion:' }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
  });
});
