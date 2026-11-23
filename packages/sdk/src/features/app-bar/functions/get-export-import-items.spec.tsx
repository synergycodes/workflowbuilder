import { describe, expect, it, vi } from 'vitest';

import '../../i18n/index';
import { getExportImportItems } from './get-export-import-items';

vi.mock('@workflow-builder/icons', () => ({
  Icon: () => null,
}));

const actions = { openExport: vi.fn(), openImport: vi.fn() };

describe('getExportImportItems', () => {
  it.each([true, false])('disables Import alone exactly when read-only mode is on (read-only: %s)', (isReadOnly) => {
    const items = getExportImportItems({ export: true, import: true }, actions, isReadOnly);

    expect(items.map(({ label, disabled }) => ({ label, disabled: disabled ?? false }))).toEqual([
      { label: 'Export', disabled: false },
      { label: 'Import', disabled: isReadOnly },
    ]);
  });
});
