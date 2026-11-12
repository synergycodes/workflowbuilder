import { describe, expect, it } from 'vitest';

import { capitalizeFirstLetter, keyToLabel, labelToSnakeCase, pathToLabel, truncate } from './text';

describe('capitalizeFirstLetter', () => {
  it('should upper-case only the first character', () => {
    expect(capitalizeFirstLetter('hello world')).toBe('Hello world');
  });

  it('should return empty text untouched', () => {
    expect(capitalizeFirstLetter('')).toBe('');
    expect(capitalizeFirstLetter()).toBe('');
  });
});

describe('truncate', () => {
  it('should cut text over the limit and append an ellipsis', () => {
    expect(truncate('abcdef', 3)).toBe('abc...');
  });

  it('should keep text within the limit', () => {
    expect(truncate('abc', 3)).toBe('abc');
  });
});

describe('keyToLabel', () => {
  it.each([
    ['firstName', 'First name'],
    ['first_name', 'First name'],
    ['first name', 'First name'],
    ['USER_ID', 'User ID'],
    ['userId', 'User ID'],
    ['html_parser', 'HTML parser'],
    ['HTMLParser', 'HTML parser'],
  ])('should turn %s into "%s"', (key, label) => {
    expect(keyToLabel(key)).toBe(label);
  });

  it.each([
    ['address_line_1', 'Address line 1'],
    ['2nd_floor', '2nd floor'],
    ['line1', 'Line1'],
    ['step2Name', 'Step2 name'],
    ['room101', 'Room101'],
    ['ID2', 'ID2'],
  ])('should keep digits in %s as "%s"', (key, label) => {
    expect(keyToLabel(key)).toBe(label);
  });

  it('should return an empty label for an empty key', () => {
    expect(keyToLabel('')).toBe('');
  });

  it('should drop non-Latin characters', () => {
    expect(keyToLabel('zażółć_gęś')).toBe('Za G');
  });
});

describe('pathToLabel', () => {
  it('should label the last segment of a dotted path', () => {
    expect(pathToLabel('nodes.writer.address_line_1')).toBe('Address line 1');
  });

  it('should label a plain key', () => {
    expect(pathToLabel('firstName')).toBe('First name');
  });

  it('should return an empty label for an empty path', () => {
    expect(pathToLabel('')).toBe('');
  });
});

describe('labelToSnakeCase', () => {
  it.each([
    ['First Name', 'first_name'],
    ['first_name', 'first_name'],
    ['userId', 'user_id'],
    ['HTML Parser', 'html_parser'],
    ['HTMLParser', 'html_parser'],
  ])('should turn "%s" into %s', (label, key) => {
    expect(labelToSnakeCase(label)).toBe(key);
  });

  it.each([
    ['Floor 2', 'floor_2'],
    ['2nd floor', '2nd_floor'],
    ['Room 101', 'room_101'],
    ['Address line 1', 'address_line_1'],
    ['Line1', 'line1'],
    ['floor2', 'floor2'],
    ['v2Beta', 'v2_beta'],
    ['42', '42'],
  ])('should keep digits in "%s" as %s', (label, key) => {
    expect(labelToSnakeCase(label)).toBe(key);
  });

  it('should drop non-Latin characters', () => {
    expect(labelToSnakeCase('Zażółć gęś')).toBe('za_g');
  });

  it.each(['Floor 2', '2nd floor', 'Address line 1', 'First name'])(
    'should round-trip "%s" through keyToLabel',
    (label) => {
      expect(keyToLabel(labelToSnakeCase(label))).toBe(label);
    },
  );
});
