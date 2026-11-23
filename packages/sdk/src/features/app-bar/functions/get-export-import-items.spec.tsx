import { describe, expect, it, vi } from 'vitest';

import '../../i18n/index';
import { getExportImportItems } from './get-export-import-items';

vi.mock('@workflow-builder/icons', () => ({
  Icon: () => null,
}));

const actions = { openExport: vi.fn(), openImport: vi.fn() };
const bothVisible = { export: true, import: true };

function itemsBy(isReadOnly: boolean, visible = bothVisible) {
  return Object.fromEntries(
    getExportImportItems(visible, actions, { isReadOnly }).map((item) => [item.label, item] as const),
  );
}

describe('getExportImportItems', () => {
  it('disables Import, and only Import, in read-only mode', () => {
    const items = itemsBy(true);

    expect(items['Import']?.disabled).toBe(true);
    expect(items['Export']?.disabled).toBeFalsy();
  });

  it('disables neither while the editor is editable', () => {
    const items = itemsBy(false);

    expect(items['Import']?.disabled).toBe(false);
    expect(items['Export']?.disabled).toBeFalsy();
  });

  it.each([true, false])('leaves a hidden Import out whatever read-only is (%s)', (isReadOnly) => {
    expect(Object.keys(itemsBy(isReadOnly, { export: true, import: false }))).toEqual(['Export']);
  });

  it('runs the actions it is given', () => {
    const items = itemsBy(false);

    expect(items['Import']?.onClick).toBe(actions.openImport);
    expect(items['Export']?.onClick).toBe(actions.openExport);
  });
});
