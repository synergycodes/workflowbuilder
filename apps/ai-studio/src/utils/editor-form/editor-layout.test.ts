import { describe, expect, it } from 'vitest';

import { editableFields, editorLayout } from './editor-layout';

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

  it('shows an optional string or boolean that structured output types with null, but not a nullable number', () => {
    const { elements } = editorLayout({
      type: 'object',
      properties: {
        note: { type: ['string', 'null'] },
        urgent: { type: ['null', 'boolean'] },
        amount: { type: ['number', 'null'] },
        either: { type: ['string', 'number'] },
      },
    });

    expect(elements.map((element) => [element.label, element.type])).toEqual([
      ['note', 'TextArea'],
      ['urgent', 'Switch'],
    ]);
  });

  it('escapes a key that JSON Pointer reserves', () => {
    const [element] = editorLayout({ type: 'object', properties: { 'a/b~c': { type: 'string' } } }).elements;

    expect(element.scope).toBe('#/properties/a~1b~0c');
  });
});

describe('editableFields', () => {
  it('names the shown fields that are not read-only', () => {
    const schema = {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        orderDate: { type: 'string', readOnly: true },
        count: { type: 'integer' },
        tags: { type: 'array' },
        urgent: { type: 'boolean' },
      },
    };

    expect([...editableFields(schema)]).toEqual(['amount', 'urgent']);
  });

  it('does not take a type named after an Object.prototype member for one it shows', () => {
    const schema = { type: 'object', properties: { odd: { type: 'constructor' } } };

    expect(editableFields(schema).size).toBe(0);
    expect(editorLayout(schema).elements).toEqual([]);
  });
});
