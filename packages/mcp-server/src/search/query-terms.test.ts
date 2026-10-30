import { createProcessTerm, hasSearchableTerms } from './query-terms.js';
import { tokenize } from './tokenize.js';

const synonyms = { map: { palette: ['nodetypes'], save: ['persist', 'storage'] }, stopwords: ['how', 'do', 'i'] };

describe('createProcessTerm', () => {
  it('lowercases at index time and ignores stopwords and synonyms', () => {
    const processTerm = createProcessTerm(synonyms, false);
    expect(processTerm('How')).toBe('how');
    expect(processTerm('Palette')).toBe('palette');
  });

  it('drops stopwords at query time', () => {
    const processTerm = createProcessTerm(synonyms, true);
    expect(processTerm('How')).toBeNull();
    expect(processTerm('node')).toBe('node');
  });

  it('expands synonyms one way at query time', () => {
    const processTerm = createProcessTerm(synonyms, true);
    expect(processTerm('Save')).toEqual(['save', 'persist', 'storage']);
    expect(processTerm('persist')).toBe('persist');
  });

  it('drops product terms only when the query has another searchable term', () => {
    const withProduct = { ...synonyms, productTerms: ['workflow', 'builder'] };
    const mixed = createProcessTerm(withProduct, true, 'Workflow Builder palette');
    expect(mixed('Workflow')).toBeNull();
    expect(mixed('WorkflowBuilder')).toBe('workflowbuilder');
    const productOnly = createProcessTerm(withProduct, true, 'how do I Workflow Builder');
    expect(productOnly('Workflow')).toBe('workflow');
    expect(productOnly('how')).toBeNull();
  });

  it('does not resolve terms off Object.prototype', () => {
    const processTerm = createProcessTerm(synonyms, true);
    expect(processTerm('constructor')).toBe('constructor');
    expect(processTerm('toString')).toBe('tostring');
  });
});

describe('hasSearchableTerms', () => {
  it('is false when every term is a stopword', () => {
    expect(hasSearchableTerms('how do I', tokenize, synonyms)).toBe(false);
    expect(hasSearchableTerms('  ', tokenize, synonyms)).toBe(false);
  });

  it('is true when something is left', () => {
    expect(hasSearchableTerms('how do I save', tokenize, synonyms)).toBe(true);
  });
});
