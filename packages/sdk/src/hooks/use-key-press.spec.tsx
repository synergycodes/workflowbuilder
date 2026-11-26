import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useKeyPress } from './use-key-press';

function press(init: KeyboardEventInit, target: EventTarget = document.body) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

describe('useKeyPress', () => {
  it('matches a key code so Shift+1 fires regardless of the layout-specific key', () => {
    const { result } = renderHook(() => useKeyPress('Digit1', { withShift: true }));

    const event = press({ key: '!', code: 'Digit1', shiftKey: true });

    expect(result.current).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it('withShift ignores the key without Shift and with Ctrl/Cmd or Alt added', () => {
    const { result } = renderHook(() => useKeyPress('Digit1', { withShift: true }));

    press({ key: '1', code: 'Digit1' });
    expect(result.current).toBe(false);

    press({ key: '!', code: 'Digit1', shiftKey: true, ctrlKey: true });
    expect(result.current).toBe(false);

    press({ key: '!', code: 'Digit1', shiftKey: true, altKey: true });
    expect(result.current).toBe(false);
  });

  it('leaves the key alone while a text field has focus', () => {
    const input = document.createElement('input');
    document.body.append(input);
    const { result } = renderHook(() => useKeyPress('Digit1', { withShift: true }));

    const event = press({ key: '!', code: 'Digit1', shiftKey: true }, input);

    expect(result.current).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    input.remove();
  });

  it('still matches plain keys by event.key', () => {
    const { result } = renderHook(() => useKeyPress('a', { withControlOrMeta: true }));

    press({ key: 'a', code: 'KeyA', ctrlKey: true });

    expect(result.current).toBe(true);
  });
});
