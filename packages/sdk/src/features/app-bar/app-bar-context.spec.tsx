import { render, renderHook, screen } from '@testing-library/react';

import { AppBarProvider, useAppBar } from './app-bar-context';

function Probe() {
  return <span>{useAppBar().version?.number}</span>;
}

describe('app bar context', () => {
  it('returns an empty object without a provider', () => {
    expect(renderHook(useAppBar).result.current).toEqual({});
  });

  it('re-renders consumers when the provider value changes', () => {
    const { rerender } = render(
      <AppBarProvider value={{ version: { number: 7, isDraft: false } }}>
        <Probe />
      </AppBarProvider>,
    );
    expect(screen.getByText('7')).toBeTruthy();

    rerender(
      <AppBarProvider value={{ version: { number: 8, isDraft: true } }}>
        <Probe />
      </AppBarProvider>,
    );
    expect(screen.getByText('8')).toBeTruthy();
  });
});
