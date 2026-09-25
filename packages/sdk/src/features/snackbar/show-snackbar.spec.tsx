import { screen } from '@testing-library/react';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeSnackbar, showSnackbar } from './show-snackbar';
import { SnackbarContainer } from './snackbar-container';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<SnackbarContainer />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const show = (options: Parameters<typeof showSnackbar>[0]) => {
  let key = '';
  act(() => {
    key = showSnackbar(options);
  });
  return key;
};

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

// notistack closes through a chain of timers, each set by an effect after the previous render.
const settle = () => {
  for (let step = 0; step < 10; step++) {
    advance(200);
  }
};

const timesShown = (text: string) => (document.body.textContent ?? '').split(text).length - 1;

const buttonNamed = (name: string) => screen.queryByRole('button', { name }) ?? undefined;

const press = (name: string) => act(() => buttonNamed(name)?.click());

describe('showSnackbar', () => {
  it('shows the title and subtitle as given', () => {
    show({ variant: 'info', title: 'Waiting for decision', subtitle: 'Review Refund' });

    expect(timesShown('Waiting for decision')).toBe(1);
    expect(timesShown('Review Refund')).toBe(1);
  });

  it('hides on its own after three seconds by default', () => {
    show({ variant: 'success', title: 'Saved' });
    advance(2900);
    expect(timesShown('Saved')).toBe(1);

    advance(100);
    settle();
    expect(timesShown('Saved')).toBe(0);
  });

  it('stays until it is closed when autoHideDuration is null', () => {
    show({ variant: 'info', title: 'Waiting for decision', autoHideDuration: null });
    advance(60_000);

    expect(timesShown('Waiting for decision')).toBe(1);
  });

  it('closes on closeSnackbar without calling onClose', () => {
    const onClose = vi.fn();
    const key = show({ variant: 'info', title: 'Waiting for decision', autoHideDuration: null, onClose });

    act(() => closeSnackbar(key));
    settle();

    expect(timesShown('Waiting for decision')).toBe(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose and closes when the person presses the close button', () => {
    const onClose = vi.fn();
    show({ variant: 'info', title: 'Waiting for decision', autoHideDuration: null, onClose });

    press('Close');
    settle();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(timesShown('Waiting for decision')).toBe(0);
  });

  it('calls onButtonClick and closes on the action button, without calling onClose', () => {
    const onButtonClick = vi.fn();
    const onClose = vi.fn();
    show({
      variant: 'info',
      title: 'Waiting for decision',
      buttonLabel: 'Decide',
      onButtonClick,
      onClose,
      autoHideDuration: null,
    });

    press('Decide');
    settle();

    expect(onButtonClick).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(timesShown('Waiting for decision')).toBe(0);
  });

  it('shows no action button without onButtonClick', () => {
    show({ variant: 'info', title: 'Waiting for decision', buttonLabel: 'Decide' });

    expect(buttonNamed('Decide')).toBeUndefined();
  });

  it('shows no close button when close is false', () => {
    show({ variant: 'info', title: 'Waiting for decision', close: false });

    expect(buttonNamed('Close')).toBeUndefined();
  });

  it('keeps one snackbar per key while it is on screen', () => {
    const first = show({ key: 'wait', variant: 'info', title: 'First', autoHideDuration: null });
    const second = show({ key: 'wait', variant: 'info', title: 'Second', autoHideDuration: null });

    expect(second).toBe(first);
    expect(timesShown('First')).toBe(1);
    expect(timesShown('Second')).toBe(0);
  });

  it('shows the key again once the snackbar under it is gone', () => {
    const key = show({ key: 'wait', variant: 'info', title: 'First', autoHideDuration: null });
    act(() => closeSnackbar(key));
    settle();

    show({ key: 'wait', variant: 'info', title: 'Second', autoHideDuration: null });

    expect(timesShown('Second')).toBe(1);
  });

  // The SDK once passed the variant as notistack's message, so a second snackbar of a variant was dropped.
  it('shows two different snackbars of the same variant together', () => {
    show({ variant: 'success', title: 'Saved data has been restored' });
    show({ variant: 'success', title: 'Diagram saved' });

    expect(timesShown('Saved data has been restored')).toBe(1);
    expect(timesShown('Diagram saved')).toBe(1);
  });

  it('without a key, shows the same snackbar once while it is on screen', () => {
    show({ variant: 'warning', title: 'Read-only mode' });
    show({ variant: 'warning', title: 'Read-only mode' });

    expect(timesShown('Read-only mode')).toBe(1);
  });
});
