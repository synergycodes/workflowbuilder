import { describe, expect, it, vi } from 'vitest';

import { type RegisteredMenuItem, createUiExtensionRegistry } from './ui-extension-registry';

function item(id: string, label = id): RegisteredMenuItem {
  return { id, label };
}

describe('createUiExtensionRegistry', () => {
  it('getAreaSlot returns the same empty object until an element is set', () => {
    const registry = createUiExtensionRegistry();
    const emptySlot = registry.getAreaSlot('appBarTools');

    expect(emptySlot.element).toBeNull();
    expect(registry.getAreaSlot('appBarTools')).toBe(emptySlot);
    expect(registry.getAreaSlot('paletteFooter')).toBe(emptySlot);

    const element = document.createElement('div');
    registry.setAreaElement('appBarTools', element);

    expect(registry.getAreaSlot('appBarTools').element).toBe(element);
    expect(registry.getAreaSlot('paletteFooter')).toBe(emptySlot);
  });

  it('setAreaElement with null empties the slot again', () => {
    const registry = createUiExtensionRegistry();
    const emptySlot = registry.getAreaSlot('appBarTools');
    registry.setAreaElement('appBarTools', document.createElement('div'));

    registry.setAreaElement('appBarTools', null);

    expect(registry.getAreaSlot('appBarTools')).toBe(emptySlot);
  });

  it('keeps the before and after targets of an area apart', () => {
    const registry = createUiExtensionRegistry();
    const emptySlot = registry.getAreaSlot('appBarTools', 'after');
    const element = document.createElement('div');

    registry.setAreaElement('appBarTools', element, 'after');

    expect(registry.getAreaSlot('appBarTools', 'after').element).toBe(element);
    expect(registry.getAreaSlot('appBarTools', 'before')).toBe(emptySlot);
    expect(registry.getAreaSlot('appBarTools')).toBe(emptySlot);
  });

  it('setAreaElement notifies subscribers', () => {
    const registry = createUiExtensionRegistry();
    const listener = vi.fn();
    registry.subscribe(listener);

    registry.setAreaElement('paletteHeader', document.createElement('div'));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('upsertMenuItem with an existing id replaces in place and keeps order', () => {
    const registry = createUiExtensionRegistry();
    registry.upsertMenuItem('propertiesPanel', item('a'));
    registry.upsertMenuItem('propertiesPanel', item('b'));
    const before = registry.getMenuItems('propertiesPanel');

    registry.upsertMenuItem('propertiesPanel', item('a', 'A renamed'));

    const after = registry.getMenuItems('propertiesPanel');
    expect(after).toEqual([item('a', 'A renamed'), item('b')]);
    expect(after).not.toBe(before);
    expect(registry.getMenuItems('project')).toEqual([]);
  });

  it('removeMenuItem notifies', () => {
    const registry = createUiExtensionRegistry();
    registry.upsertMenuItem('propertiesPanel', item('a'));
    registry.upsertMenuItem('propertiesPanel', item('b'));
    const listener = vi.fn();
    registry.subscribe(listener);

    registry.removeMenuItem('propertiesPanel', 'a');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(registry.getMenuItems('propertiesPanel')).toEqual([item('b')]);
  });

  it('getHeaderSupply is undefined until one is supplied', () => {
    const registry = createUiExtensionRegistry();
    const onCleanUp = vi.fn();

    expect(registry.getHeaderSupply('cleanUp')).toBeUndefined();

    registry.upsertHeaderSupply('cleanUp', 'a', onCleanUp);

    expect(registry.getHeaderSupply('cleanUp')).toBe(onCleanUp);
    expect(registry.getHeaderSupply('publish')).toBeUndefined();
  });

  it('the supply added last is in use, and the earlier one returns once it is removed', () => {
    const registry = createUiExtensionRegistry();
    const first = vi.fn();
    const second = vi.fn();
    registry.upsertHeaderSupply('saveAsPdf', 'a', first);
    registry.upsertHeaderSupply('saveAsPdf', 'b', second);

    expect(registry.getHeaderSupply('saveAsPdf')).toBe(second);

    registry.removeHeaderSupply('saveAsPdf', 'b');

    expect(registry.getHeaderSupply('saveAsPdf')).toBe(first);
  });

  it('upsertHeaderSupply with a known id replaces it where it stands', () => {
    const registry = createUiExtensionRegistry();
    registry.upsertHeaderSupply('version', 'a', { number: 1, isDraft: true });
    registry.upsertHeaderSupply('version', 'b', { number: 2, isDraft: true });

    registry.upsertHeaderSupply('version', 'a', { number: 3, isDraft: false });

    expect(registry.getHeaderSupply('version')).toEqual({ number: 2, isDraft: true });
    registry.removeHeaderSupply('version', 'b');
    expect(registry.getHeaderSupply('version')).toEqual({ number: 3, isDraft: false });
  });

  it('header supplies and the clean-up pending flag notify only on a change', () => {
    const registry = createUiExtensionRegistry();
    const listener = vi.fn();
    registry.subscribe(listener);

    registry.upsertHeaderSupply('publish', 'a', vi.fn());
    registry.removeHeaderSupply('publish', 'a');
    registry.removeHeaderSupply('publish', 'a');
    registry.setCleanUpPending(true);
    registry.setCleanUpPending(true);

    expect(listener).toHaveBeenCalledTimes(3);
    expect(registry.isCleanUpPending()).toBe(true);
  });

  it('subscribe returns an unsubscribe', () => {
    const registry = createUiExtensionRegistry();
    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);

    unsubscribe();
    registry.upsertMenuItem('project', item('a'));
    registry.setAreaElement('appBarControls', document.createElement('div'));

    expect(listener).not.toHaveBeenCalled();
  });
});
