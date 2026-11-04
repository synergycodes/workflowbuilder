import { describe, expect, it } from 'vitest';

import { snackbarOffsetBottom } from './snackbar-offset';

describe('snackbarOffsetBottom', () => {
  it('lifts the snackbars 12px above the top edge of the dock', () => {
    expect(snackbarOffsetBottom(655, 911)).toBe(268);
  });

  it('rounds to whole pixels', () => {
    expect(snackbarOffsetBottom(654.6, 911)).toBe(268);
  });

  it('stops at half the viewport, so a tall dock on a short window keeps the stack on screen', () => {
    expect(snackbarOffsetBottom(216, 650)).toBe(325);
  });
});
