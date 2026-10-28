import { tokenize } from './tokenize.js';

describe('tokenize', () => {
  it('keeps the token and adds camel and pascal parts', () => {
    expect(tokenize('WorkflowBuilderRootProps')).toEqual([
      'WorkflowBuilderRootProps',
      'Workflow',
      'Builder',
      'Root',
      'Props',
    ]);
    expect(tokenize('nodeTypes')).toEqual(['nodeTypes', 'node', 'Types']);
  });

  it('splits constants and digits', () => {
    expect(tokenize('DEFAULT_TASK_QUEUE')).toEqual(['DEFAULT', 'TASK', 'QUEUE']);
    expect(tokenize('upgrade-to-3')).toEqual(['upgrade', 'to', '3']);
    expect(tokenize('h2Title')).toEqual(['h2Title', 'h', '2', 'Title']);
  });

  it('splits acronyms before a word', () => {
    expect(tokenize('HTMLElement')).toEqual(['HTMLElement', 'HTML', 'Element']);
  });

  it('returns nothing for punctuation only', () => {
    expect(tokenize(' -- ,, ')).toEqual([]);
  });
});
