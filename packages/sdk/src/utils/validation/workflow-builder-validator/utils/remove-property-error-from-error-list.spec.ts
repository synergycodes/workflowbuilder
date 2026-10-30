import type { OutputUnit } from '@cfworker/json-schema';
import { describe, expect, it } from 'vitest';

import { removeErrorFromErrorsList } from './remove-property-error-from-error-list';

const missingBody: OutputUnit = {
  instanceLocation: '#',
  keyword: 'required',
  keywordLocation: '#/required',
  error: 'Instance does not have required property "body".',
};

const toDoesNotMatch: OutputUnit = {
  instanceLocation: '#',
  keyword: 'properties',
  keywordLocation: '#/properties',
  error: 'Property "to" does not match schema.',
};

const toItems: OutputUnit = {
  instanceLocation: '#/to',
  keyword: 'items',
  keywordLocation: '#/properties/to/items',
  error: 'Items did not match schema.',
};

const toSecondItemFormat: OutputUnit = {
  instanceLocation: '#/to/1',
  keyword: 'format',
  keywordLocation: '#/properties/to/items/format',
  error: 'String does not match format "email".',
};

const errors: OutputUnit[] = [missingBody, toDoesNotMatch, toItems, toSecondItemFormat];

describe('removeErrorFromErrorsList', () => {
  describe('mode: exact', () => {
    it('should remove errors mentioning the property in the message or pointing directly at it', () => {
      const result = removeErrorFromErrorsList({ errors, propertyName: 'to', mode: 'exact' });

      // `toDoesNotMatch` mentions "to" in the message, `toItems` points at `#/to`
      expect(result).toEqual([missingBody, toSecondItemFormat]);
    });

    it('should keep nested errors of the property', () => {
      const result = removeErrorFromErrorsList({ errors, propertyName: 'to', mode: 'exact' });

      expect(result).toContain(toSecondItemFormat);
    });

    it('should remove an error found only in the message', () => {
      const result = removeErrorFromErrorsList({ errors, propertyName: 'body', mode: 'exact' });

      expect(result).toEqual([toDoesNotMatch, toItems, toSecondItemFormat]);
    });

    it('should remove an error whose keywordLocation ends with the property', () => {
      const result = removeErrorFromErrorsList({ errors, propertyName: 'items', mode: 'exact' });

      expect(result).toEqual([missingBody, toDoesNotMatch, toSecondItemFormat]);
    });

    it('should keep all errors when the property is not mentioned', () => {
      const result = removeErrorFromErrorsList({ errors, propertyName: 'subject', mode: 'exact' });

      expect(result).toEqual(errors);
    });
  });

  describe('mode: all', () => {
    it('should remove the property error together with all its nested errors', () => {
      const result = removeErrorFromErrorsList({ errors, propertyName: 'to', mode: 'all' });

      expect(result).toEqual([missingBody]);
    });

    it('should remove nested errors matched by keywordLocation', () => {
      const result = removeErrorFromErrorsList({ errors, propertyName: 'items', mode: 'all' });

      expect(result).toEqual([missingBody, toDoesNotMatch]);
    });

    it('should remove an error found only in the message', () => {
      const result = removeErrorFromErrorsList({ errors, propertyName: 'body', mode: 'all' });

      expect(result).toEqual([toDoesNotMatch, toItems, toSecondItemFormat]);
    });

    it('should keep all errors when the property is not mentioned', () => {
      const result = removeErrorFromErrorsList({ errors, propertyName: 'subject', mode: 'all' });

      expect(result).toEqual(errors);
    });
  });

  it('should not match a property that is only a prefix of another one', () => {
    const totalErrors: OutputUnit[] = [
      {
        instanceLocation: '#',
        keyword: 'properties',
        keywordLocation: '#/properties',
        error: 'Property "total" does not match schema.',
      },
      {
        instanceLocation: '#/total',
        keyword: 'type',
        keywordLocation: '#/properties/total/type',
        error: 'Instance type "string" is invalid. Expected "number".',
      },
    ];

    expect(removeErrorFromErrorsList({ errors: totalErrors, propertyName: 'to', mode: 'exact' })).toEqual(totalErrors);
    expect(removeErrorFromErrorsList({ errors: totalErrors, propertyName: 'to', mode: 'all' })).toEqual(totalErrors);
  });

  it('should return an empty list for an empty list of errors', () => {
    expect(removeErrorFromErrorsList({ errors: [], propertyName: 'to', mode: 'exact' })).toEqual([]);
    expect(removeErrorFromErrorsList({ errors: [], propertyName: 'to', mode: 'all' })).toEqual([]);
  });
});
