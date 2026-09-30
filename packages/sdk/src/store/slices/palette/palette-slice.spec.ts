import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setCustomPaletteNodes } from '../../../data/palette';
import type { PaletteItem } from '../../../node/common';
import { resetWorkflowStore, useStore } from '../../store';

const definition = {
  label: 'Trigger',
  type: 'my-product/trigger',
  icon: 'Lightning',
  accent: 'orange',
  defaultPropertiesData: {},
  schema: { type: 'object', properties: {} },
} as PaletteItem;

beforeEach(() => {
  resetWorkflowStore();
});

afterEach(() => {
  setCustomPaletteNodes(null);
});

describe('getNodeDefinition', () => {
  it('finds a grouped definition before the Palette has loaded its data', () => {
    setCustomPaletteNodes([{ label: 'Triggers', groupItems: [definition] }]);

    expect(useStore.getState().data).toEqual([]);
    expect(useStore.getState().getNodeDefinition(definition.type)).toBe(definition);
  });

  it('prefers the loaded palette data', () => {
    const loaded = { ...definition, accent: 'green' } as PaletteItem;
    setCustomPaletteNodes([definition]);
    useStore.setState({ data: [loaded] });

    expect(useStore.getState().getNodeDefinition(definition.type)).toBe(loaded);
  });

  it('does not resolve a type named after an Object.prototype member', () => {
    setCustomPaletteNodes([definition]);

    expect(useStore.getState().getNodeDefinition('constructor')).toBeUndefined();
  });
});
