// Heuristic format detection for the Visualize node's `auto` mode. Maps a raw
// output string to the renderer that fits it best. Conservative by design: only
// picks `chart`/`diagram` on an unambiguous signal, and falls back to `markdown`
// (react-markdown renders plain prose fine too) rather than raw `text`. `text`
// (<pre>) is reachable via explicit override only.

export type VisualizeRenderer = 'markdown' | 'text' | 'json' | 'table' | 'stat-cards' | 'chart' | 'diagram';

export type DetectResult = {
  renderer: VisualizeRenderer;
  // Parsed payload for structured formats (json/table/chart), so renderers do not re-parse.
  data?: unknown;
  // True when the data could also be charted (drives the "try as chart" suggestion).
  chartable?: boolean;
};

// A fenced ```mermaid block, or a first line that is unambiguously a mermaid
// declaration. Deliberately strict: flowchart/graph need a direction, and
// prose-like bare words ("pie", "graph", "timeline", "journey") are NOT matched,
// so plain prose starting with such a word is not mis-detected as a diagram.
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

function hasNumericColumn(rows: Record<string, unknown>[]): boolean {
  if (rows.length === 0) {
    return false;
  }
  return Object.keys(rows[0]).some((key) => rows.every((row) => typeof row[key] === 'number'));
}

function detectJson(parsed: unknown): DetectResult | null {
  // Explicit chart spec envelope: { type: 'bar'|'line'|..., data: [...] }
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
      return { renderer: 'chart', data: parsed, chartable: true };
    }
    if (parsed.length > 0 && parsed.every(isPlainObject)) {
      return { renderer: 'table', data: parsed, chartable: hasNumericColumn(parsed as Record<string, unknown>[]) };
    }
    return {
      renderer: 'table',
      data: parsed,
      chartable: parsed.length > 0 && parsed.every((v) => typeof v === 'number'),
    };
  }

  if (isPlainObject(parsed)) {
    return Object.values(parsed).every(isScalar)
      ? { renderer: 'stat-cards', data: parsed }
      : { renderer: 'json', data: parsed };
  }

  return null; // scalar JSON (number/string/bool) is not "structured"
}

function parseCsv(text: string): Record<string, string>[] | null {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return null;
  }
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const counts = lines.map((line) => line.split(delimiter).length);
  // Strong guard against prose: every line must have the same column count (>= 2).
  if (counts[0] < 2 || !counts.every((c) => c === counts[0])) {
    return null;
  }
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  // Headers should look like headers, not sentences.
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

  // 1. Mermaid diagram: a fenced ```mermaid block, or a clearly-declared first line.
  const fence = MERMAID_FENCE.exec(text);
  if (fence) {
    return { renderer: 'diagram', data: fence[1].trim() };
  }
  const firstLine = text.split(/\r?\n/)[0].trim();
  if (MERMAID_FIRST_LINE.test(firstLine)) {
    return { renderer: 'diagram', data: text };
  }

  // 2. JSON (gate on { or [ so bare scalars do not register as JSON).
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const result = detectJson(JSON.parse(text));
      if (result) {
        return result;
      }
    } catch {
      // not valid JSON — fall through
    }
  }

  // 3. CSV / TSV.
  const csv = parseCsv(text);
  if (csv) {
    return { renderer: 'table', data: csv };
  }

  // 4. Fallback: markdown (handles both real markdown and plain prose well).
  return { renderer: 'markdown' };
}
