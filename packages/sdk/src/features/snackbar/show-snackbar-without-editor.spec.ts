import { describe, expect, it } from 'vitest';

import { closeSnackbar, showSnackbar } from './show-snackbar';

// Its own file: no SnackbarProvider has mounted in this module graph, as before an editor mounts.
describe('snackbars before an editor mounts', () => {
  it('show nothing and do not throw', () => {
    expect(() => closeSnackbar('any')).not.toThrow();
    expect(() => showSnackbar({ variant: 'info', title: 'Early' })).not.toThrow();
  });
});
