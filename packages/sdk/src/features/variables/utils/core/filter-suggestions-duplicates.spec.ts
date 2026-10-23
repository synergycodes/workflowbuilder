import { describe, expect, it } from 'vitest';

import type { VariableSuggestion } from '../../components/variable-text/variable-text.types';
import { filterSuggestionsDuplicates } from './filter-suggestions-duplicates';

function createSuggestion(id: string, label = id): VariableSuggestion {
  return {
    id,
    display: id,
    label,
    type: 'string',
  };
}

const alphaSuggestion = createSuggestion('alpha');
const betaSuggestion = createSuggestion('beta');
const gammaSuggestion = createSuggestion('gamma');

describe('filterSuggestionsDuplicates', () => {
  it('should return an empty array for an empty list', () => {
    const result = filterSuggestionsDuplicates([]);

    expect(result).toEqual([]);
  });

  it('should return all suggestions when ids are unique', () => {
    const result = filterSuggestionsDuplicates([alphaSuggestion, betaSuggestion, gammaSuggestion]);

    expect(result).toEqual([alphaSuggestion, betaSuggestion, gammaSuggestion]);
  });

  it('should drop suggestions with a repeated id', () => {
    const result = filterSuggestionsDuplicates([alphaSuggestion, betaSuggestion, alphaSuggestion, betaSuggestion]);

    expect(result).toEqual([alphaSuggestion, betaSuggestion]);
  });

  it('should keep the first occurrence when duplicates differ in other fields', () => {
    const laterAlphaSuggestion = createSuggestion('alpha', 'Alpha (later)');

    const result = filterSuggestionsDuplicates([alphaSuggestion, laterAlphaSuggestion]);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(alphaSuggestion);
  });

  it('should preserve the order of first occurrences', () => {
    const result = filterSuggestionsDuplicates([
      gammaSuggestion,
      alphaSuggestion,
      gammaSuggestion,
      betaSuggestion,
      alphaSuggestion,
    ]);

    expect(result).toEqual([gammaSuggestion, alphaSuggestion, betaSuggestion]);
  });

  it('should collapse many repeats of a single id to one entry', () => {
    const result = filterSuggestionsDuplicates([alphaSuggestion, alphaSuggestion, alphaSuggestion]);

    expect(result).toEqual([alphaSuggestion]);
  });

  it('should not mutate the input array', () => {
    const input = [alphaSuggestion, alphaSuggestion, betaSuggestion];
    const snapshot = [...input];

    filterSuggestionsDuplicates(input);

    expect(input).toEqual(snapshot);
  });
});
