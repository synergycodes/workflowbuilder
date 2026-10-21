import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerFunctionDecorator } from '../../../features/plugins-core/adapters/adapter-functions';

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

let paletteDataCalls = 0;

registerFunctionDecorator('getPaletteData', {
  place: 'after',
  name: 'palette-slice-spec-counter',
  callback: ({ returnValue }) => {
    paletteDataCalls += 1;
    return { replacedReturn: [...(returnValue as PaletteItem[])] };
  },
});

beforeEach(() => {
  resetWorkflowStore();
  paletteDataCalls = 0;
});

afterEach(() => {
  setCustomPaletteNodes(null);
});

describe('getNodeDefinition', () => {
  it('finds a grouped definition in the palette data', () => {
    useStore.setState({ data: [{ label: 'Triggers', groupItems: [definition] }] });

    expect(useStore.getState().getNodeDefinition(definition.type)).toBe(definition);
  });

  it('never calls the decoratable getPaletteData, even while the palette data is empty', () => {
    setCustomPaletteNodes([definition]);

    for (let update = 0; update < 3; update++) {
      useStore.setState({ isSidebarExpanded: update % 2 === 0 });
      useStore.getState().getNodeDefinition(definition.type);
    }

    expect(paletteDataCalls).toBe(0);
  });

  it('does not resolve a type named after an Object.prototype member', () => {
    useStore.setState({ data: [definition] });

    expect(useStore.getState().getNodeDefinition('constructor')).toBeUndefined();
  });
});
