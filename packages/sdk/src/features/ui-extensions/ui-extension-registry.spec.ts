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

  it('setAreaElement notifies subscribers', () => {
    const registry = createUiExtensionRegistry();
    const listener = vi.fn();
    registry.subscribe(listener);

    registry.setAreaElement('paletteHeader', document.createElement('div'));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('upsertMenuItem with an existing id replaces in place and keeps order', () => {
    const registry = createUiExtensionRegistry();
    registry.upsertMenuItem('appBar', item('a'));
    registry.upsertMenuItem('appBar', item('b'));
    const before = registry.getMenuItems('appBar');

    registry.upsertMenuItem('appBar', item('a', 'A renamed'));

    const after = registry.getMenuItems('appBar');
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
