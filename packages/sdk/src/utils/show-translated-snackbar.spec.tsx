import i18n from 'i18next';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import '../features/i18n/index';
import { SnackbarContainer } from '../features/snackbar/snackbar-container';
import { showTranslatedSnackbar } from './show-translated-snackbar';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<SnackbarContainer />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const timesShown = (text: string) => (document.body.textContent ?? '').split(text).length - 1;

describe('showTranslatedSnackbar', () => {
  it('shows a repeated SDK message once while it is on screen', () => {
    act(() => {
      showTranslatedSnackbar({ variant: 'warning', title: 'cantEditReadOnlyMode' });
      showTranslatedSnackbar({ variant: 'warning', title: 'cantEditReadOnlyMode' });
    });

    expect(timesShown(i18n.t('snackbar.cantEditReadOnlyMode'))).toBe(1);
  });
});
