export type VisualizeRenderer = 'markdown' | 'text' | 'json' | 'table' | 'stat-cards' | 'chart' | 'diagram';

type DetectResult = {
  renderer: VisualizeRenderer;
  data?: unknown;
};

// Strict on purpose: flowchart/graph require a direction so prose isn't mis-detected as a diagram.
const MERMAID_FENCE = /^```mermaid\s*\n?([\s\S]*?)```$/;
const MERMAID_FIRST_LINE =
  /^(?:sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|gitGraph|mindmap|quadrantChart|requirementDiagram)\b|^(?:flowchart|graph)\s+(?:TB|TD|BT|RL|LR)\b/;

const LABEL_KEYS = new Set(['label', 'name', 'category', 'x', 'key', 'date', 'month', 'day']);
const VALUE_KEYS = new Set(['value', 'count', 'y', 'amount', 'total', 'qty', 'quantity', 'score']);
const CHART_TYPES = new Set(['bar', 'line', 'pie', 'area', 'donut']);

function isScalar(value: unknown): boolean {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function looksLikeChartArray(array: unknown[]): boolean {
  if (array.length === 0) {
    return false;
  }
  return array.every((item) => {
    if (!isPlainObject(item)) {
      return false;
    }
    const keys = Object.keys(item).map((k) => k.toLowerCase());
    const hasLabel = keys.some((k) => LABEL_KEYS.has(k));
    const hasNumericValue = Object.entries(item).some(
      ([k, v]) => VALUE_KEYS.has(k.toLowerCase()) && typeof v === 'number',
    );
    return hasLabel && hasNumericValue;
  });
}

function detectJson(parsed: unknown): DetectResult | null {
  if (
    isPlainObject(parsed) &&
    typeof parsed['type'] === 'string' &&
    Array.isArray(parsed['data']) &&
    CHART_TYPES.has(parsed['type'].toLowerCase())
  ) {
    return { renderer: 'chart', data: parsed };
  }

  if (Array.isArray(parsed)) {
    if (looksLikeChartArray(parsed)) {
      return { renderer: 'chart', data: parsed };
    }
    if (parsed.length > 0 && parsed.every(isPlainObject)) {
      return { renderer: 'table', data: parsed };
    }
    return { renderer: 'table', data: parsed };
  }

  if (isPlainObject(parsed)) {
    return Object.values(parsed).every(isScalar)
      ? { renderer: 'stat-cards', data: parsed }
      : { renderer: 'json', data: parsed };
  }

  return null;
}

function parseCsv(text: string): Record<string, string>[] | null {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return null;
  }
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const counts = lines.map((line) => line.split(delimiter).length);
  if (counts[0] < 2 || !counts.every((c) => c === counts[0])) {
    return null;
  }
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  if (headers.some((h) => h.length === 0 || h.length > 30)) {
    return null;
  }
  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter);
    const row: Record<string, string> = {};
    for (const [index, header] of headers.entries()) {
      row[header] = (cells[index] ?? '').trim();
    }
    return row;
  });
}

export function detectFormat(input: string): DetectResult {
  const text = (input ?? '').trim();
  if (!text) {
    return { renderer: 'text' };
  }

  const fence = MERMAID_FENCE.exec(text);
  if (fence) {
    return { renderer: 'diagram', data: fence[1].trim() };
  }
  const firstLine = text.split(/\r?\n/)[0].trim();
  if (MERMAID_FIRST_LINE.test(firstLine)) {
    return { renderer: 'diagram', data: text };
  }

  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const result = detectJson(JSON.parse(text));
      if (result) {
        return result;
      }
    } catch {
      // not JSON
    }
  }

  const csv = parseCsv(text);
  if (csv) {
    return { renderer: 'table', data: csv };
  }

  return { renderer: 'markdown' };
}
