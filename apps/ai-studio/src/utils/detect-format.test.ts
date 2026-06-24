import { describe, expect, it } from 'vitest';

import { detectFormat } from './detect-format';

describe('detectFormat', () => {
  it('returns text for empty input', () => {
    expect(detectFormat('').renderer).toBe('text');
    expect(detectFormat('   ').renderer).toBe('text');
  });

  it('falls back to markdown for prose and markdown', () => {
    expect(detectFormat('Hi Marcus, sorry about the double charge.').renderer).toBe('markdown');
    expect(detectFormat('# Title\n\nSome **bold** text.').renderer).toBe('markdown');
  });

  it('detects a mermaid diagram from the leading keyword', () => {
    expect(detectFormat('flowchart TD\n  A --> B').renderer).toBe('diagram');
    expect(detectFormat('sequenceDiagram\n  A->>B: hi').renderer).toBe('diagram');
  });

  it('detects a flat scalar object as stat-cards', () => {
    const result = detectFormat('{"users": 1200, "churn": 0.03, "plan": "Pro"}');
    expect(result.renderer).toBe('stat-cards');
    expect(result.data).toEqual({ users: 1200, churn: 0.03, plan: 'Pro' });
  });

  it('detects a nested object as json tree', () => {
    expect(detectFormat('{"a": {"b": 1}}').renderer).toBe('json');
  });

  it('detects an array of objects as a table', () => {
    const result = detectFormat('[{"id": 1, "city": "NY"}, {"id": 2, "city": "LA"}]');
    expect(result.renderer).toBe('table');
    expect(result.chartable).toBe(true); // id is a numeric column
  });

  it('detects a {label,value} array as a chart', () => {
    expect(detectFormat('[{"name": "A", "value": 3}, {"name": "B", "value": 5}]').renderer).toBe('chart');
    expect(detectFormat('[{"x": "Jan", "y": 10}, {"x": "Feb", "y": 20}]').renderer).toBe('chart');
  });

  it('detects an explicit chart-spec envelope', () => {
    const result = detectFormat('{"type": "bar", "data": [{"k": 1}]}');
    expect(result.renderer).toBe('chart');
  });

  it('detects CSV as a table', () => {
    const result = detectFormat('name,age\nAlice,30\nBob,25');
    expect(result.renderer).toBe('table');
    expect((result.data as Record<string, string>[])[0]).toEqual({ name: 'Alice', age: '30' });
  });

  it('does not mistake comma-prose for CSV', () => {
    expect(detectFormat('Hi there,\nthanks a lot, really, for everything you did.').renderer).toBe('markdown');
  });

  it('does not treat a bare scalar as JSON', () => {
    expect(detectFormat('42').renderer).toBe('markdown');
    expect(detectFormat('"hello"').renderer).toBe('markdown');
  });
});
