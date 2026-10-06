import { describe, expect, it } from 'vitest';

import type { VariableType } from '@workflow-builder/types/node-output-schema';

import type { VariableSuggestion } from '../../components/variable-text/variable-text.types';
import { filterSuggestionsByTypes } from './filter-suggestions-by-types';

function createSuggestion(id: string, type: VariableType): VariableSuggestion {
  return {
    id,
    display: id,
    label: id,
    type,
  };
}

const stringSuggestion = createSuggestion('string-1', 'string');
const numberSuggestion = createSuggestion('number-1', 'number');
const booleanSuggestion = createSuggestion('boolean-1', 'boolean');
const objectSuggestion = createSuggestion('object-1', 'object');

const suggestions = [stringSuggestion, numberSuggestion, booleanSuggestion, objectSuggestion];

describe('filterSuggestionsByTypes', () => {
  it('should return all suggestions when no types are excluded and includeTypes is empty', () => {
    const result = filterSuggestionsByTypes({ suggestions, excludeTypes: [], includeTypes: [] });

    expect(result).toEqual(suggestions);
  });

  it('should return all suggestions when includeTypes is undefined', () => {
    const result = filterSuggestionsByTypes({ suggestions, excludeTypes: [], includeTypes: undefined });

    expect(result).toEqual(suggestions);
  });

  it('should remove excluded types', () => {
    const result = filterSuggestionsByTypes({
      suggestions,
      excludeTypes: ['object', 'boolean'],
      includeTypes: [],
    });

    expect(result).toEqual([stringSuggestion, numberSuggestion]);
  });

  it('should keep only included types', () => {
    const result = filterSuggestionsByTypes({
      suggestions,
      excludeTypes: [],
      includeTypes: ['number'],
    });

    expect(result).toEqual([numberSuggestion]);
  });

  it('should apply both excludeTypes and includeTypes', () => {
    const result = filterSuggestionsByTypes({
      suggestions,
      excludeTypes: ['number'],
      includeTypes: ['string', 'number'],
    });

    expect(result).toEqual([stringSuggestion]);
  });

  it('should prioritize excludeTypes over includeTypes for the same type', () => {
    const result = filterSuggestionsByTypes({
      suggestions,
      excludeTypes: ['string'],
      includeTypes: ['string'],
    });

    expect(result).toEqual([]);
  });

  it('should return an empty array when includeTypes matches nothing', () => {
    const result = filterSuggestionsByTypes({
      suggestions,
      excludeTypes: [],
      includeTypes: ['array'],
    });

    expect(result).toEqual([]);
  });

  it('should keep every suggestion of a matching type', () => {
    const anotherStringSuggestion = createSuggestion('string-2', 'string');

    const result = filterSuggestionsByTypes({
      suggestions: [...suggestions, anotherStringSuggestion],
      excludeTypes: [],
      includeTypes: ['string'],
    });

    expect(result).toEqual([stringSuggestion, anotherStringSuggestion]);
  });

  it('should handle an empty suggestions list', () => {
    const result = filterSuggestionsByTypes({
      suggestions: [],
      excludeTypes: ['string'],
      includeTypes: ['number'],
    });

    expect(result).toEqual([]);
  });
});
