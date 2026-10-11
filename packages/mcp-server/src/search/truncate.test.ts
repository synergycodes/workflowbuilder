import { estimateTokens } from './tokens.js';
import { excerpt, excerptFrom, truncateInline, truncateToTokens } from './truncate.js';

describe('estimateTokens', () => {
  it('is the character count divided by four, rounded up', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
  });
});

describe('truncateToTokens', () => {
  it('returns short text unchanged', () => {
    expect(truncateToTokens('short', 10)).toEqual({ text: 'short', truncated: false });
  });

  it('cuts at the last newline and appends the marker', () => {
    const text = 'line one\nline two\nline three\nline four';
    const result = truncateToTokens(text, 5);
    expect(result.truncated).toBe(true);
    expect(result.text).toBe('line one\nline two\n…[truncated]');
  });

  it('closes an open code fence', () => {
    const text = '```ts\nconst a = 1;\nconst b = 2;\nconst c = 3;\n```';
    const result = truncateToTokens(text, 8);
    expect(result.text).toBe('```ts\nconst a = 1;\nconst b = 2;\n```\n…[truncated]');
  });

  it('does not add a fence when the cut is outside one', () => {
    const text = '```ts\nx\n```\n\nparagraph one is here\n\nparagraph two is here';
    expect(truncateToTokens(text, 12).text).not.toMatch(/```\n…/);
  });

  it('cuts mid-line when there is no newline', () => {
    const result = truncateToTokens('a'.repeat(100), 5);
    expect(result.text).toBe(`${'a'.repeat(20)}\n…[truncated]`);
  });
});

describe('truncateInline', () => {
  it('shortens with an ellipsis', () => {
    expect(truncateInline('abcdefghij', 2)).toBe('abcdefg…');
    expect(truncateInline('abc', 2)).toBe('abc');
  });
});

describe('excerpt', () => {
  it('returns short text unchanged', () => {
    expect(excerpt('short text', 20)).toEqual({ text: 'short text', truncated: false });
  });

  it('cuts at the last word boundary and appends an ellipsis', () => {
    expect(excerpt('alpha beta gamma delta', 13)).toEqual({ text: 'alpha beta…', truncated: true });
  });

  it('cuts mid-word when there is no space', () => {
    expect(excerpt('a'.repeat(30), 10).text).toBe(`${'a'.repeat(9)}…`);
  });

  it('closes an open code fence', () => {
    expect(excerpt('```ts\nconst a = 1;\nconst b = 2;\n```', 20).text).toBe('```ts\nconst a =…\n```');
  });
});

describe('excerpt bound', () => {
  it('stays within maxChars including the ellipsis and a closing fence', () => {
    const text = '```ts\n' + 'const value = 1;\n'.repeat(120);
    expect(excerpt(text, 1000).text.length).toBeLessThanOrEqual(1000);
    expect(excerptFrom(text, 1000, 1500).text.length).toBeLessThanOrEqual(1000);
    expect(excerpt('word '.repeat(400), 1000).text.length).toBeLessThanOrEqual(1000);
  });
});
