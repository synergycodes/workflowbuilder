import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../integration/components/save-button/save-button', () => ({
  SaveButton: () => null,
}));

vi.mock('../../../plugins-core/components/app/optional-app-bar-toolbar', () => ({
  OptionalAppBarTools: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../../assets/workflow-builder-logo.svg?react', () => ({
  default: () => <svg data-testid="built-in-logo" />,
}));

const { setAppBarBranding } = await import('../../../../data/app-bar-branding');
const { Toolbar } = await import('./toolbar');

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
