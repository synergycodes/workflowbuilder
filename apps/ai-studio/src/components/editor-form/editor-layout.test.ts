import { describe, expect, it } from 'vitest';

import { editorLayout } from './editor-layout';

describe('editorLayout', () => {
  it('lays out one editor control per field, labelled by its title or its key, and leaves out an array', () => {
    const schema = {
      type: 'object',
      properties: {
        amount: { type: 'number', title: 'Amount' },
        note: { type: 'string' },
        tags: { type: 'array' },
      },
    };

    expect(editorLayout(schema)).toEqual({
      type: 'VerticalLayout',
      elements: [
        { type: 'Text', scope: '#/properties/amount', label: 'Amount' },
        { type: 'TextArea', scope: '#/properties/note', label: 'note' },
      ],
    });
  });

  it('maps boolean to a switch and leaves integer out', () => {
    const { elements } = editorLayout({
      type: 'object',
      properties: { count: { type: 'integer' }, urgent: { type: 'boolean' } },
    });

    expect(elements.map((element) => element.type)).toEqual(['Switch']);
  });

  it('escapes a key that JSON Pointer reserves', () => {
    const [element] = editorLayout({ type: 'object', properties: { 'a/b~c': { type: 'string' } } }).elements;

    expect(element.scope).toBe('#/properties/a~1b~0c');
  });
});
