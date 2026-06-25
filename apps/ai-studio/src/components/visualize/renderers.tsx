import { type ComponentType, lazy, useState } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import styles from './renderers.module.css';

import { type VisualizeRenderer, detectFormat } from '../../utils/detect-format';

// Lazy so recharts (~140KB) only loads when a chart is actually rendered.
const ChartRenderer = lazy(() => import('./chart-renderer').then((module) => ({ default: module.ChartRenderer })));
// Lazy so mermaid (~150KB) only loads when a diagram is actually rendered.
const DiagramRenderer = lazy(() =>
  import('./diagram-renderer').then((module) => ({ default: module.DiagramRenderer })),
);

export type RendererProps = {
  text: string;
  // Pre-parsed payload from detectFormat (auto mode); renderers parse `text` themselves otherwise.
  data?: unknown;
};

export const RENDERER_LABELS: Record<VisualizeRenderer, string> = {
  markdown: 'Markdown',
  text: 'Text',
  json: 'JSON',
  table: 'Table',
  'stat-cards': 'Stat cards',
  chart: 'Chart',
  diagram: 'Diagram',
};

function parseOr(text: string, data: unknown): unknown {
  if (data !== undefined) {
    return data;
  }
  try {
    return JSON.parse(text);
  } catch {
    // not raw JSON — try a fenced ```json block (LLM output often wraps it)
  }
  const fence = /```(?:json)?\s*\n?([\s\S]*?)```/.exec(text);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      // fenced content is not JSON either
    }
  }
  return undefined;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function humanize(key: string): string {
  return key
    .replaceAll(/[_-]+/g, ' ')
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

// Cell / value strings from an LLM often carry markdown (bold, lists, links,
// code). Render those as markdown; leave plain strings untouched so values like
// "user_id" or "a_b" are not mangled. Raw HTML is intentionally NOT rendered
// (escaped) to avoid XSS from untrusted model output.
function hasRichText(value: string): boolean {
  return (
    value.includes('\n') ||
    /\*\*|__|~~/.test(value) ||
    /`[^`]+`/.test(value) ||
    /\[[^\]]+\]\([^)]+\)/.test(value) ||
    /^\s*(?:#{1,6}\s|[-*+]\s|>\s|\d+\.\s)/m.test(value)
  );
}

function RichText({ value }: { value: string }) {
  if (!hasRichText(value)) {
    return <>{value}</>;
  }
  return (
    <div className={styles['rich']}>
      <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
    </div>
  );
}

// Render fenced code blocks richly: a ```mermaid block becomes a real diagram,
// a ```json block is detected and rendered (chart/table/json/...), so a mixed
// markdown response with an embedded diagram/data block renders it inline rather
// than as raw code. `pre` is unwrapped so these block renderers own their wrapper.
const markdownComponents: Components = {
  pre: ({ children }) => <>{children}</>,
  code({ className, children }) {
    const language = /language-(\w+)/.exec(className ?? '')?.[1];
    const value = String(children).replace(/\n$/, '');
    if (language === 'mermaid') {
      return <DiagramRenderer text={value} />;
    }
    if (language === 'json') {
      const detected = detectFormat(value);
      const Renderer = getRenderer(detected.renderer);
      return <Renderer text={value} data={detected.data} />;
    }
    if (language) {
      return (
        <pre>
          <code className={className}>{children}</code>
        </pre>
      );
    }
    return <code className={className}>{children}</code>;
  },
};

function MarkdownRenderer({ text }: RendererProps) {
  return (
    <div className={styles['markdown']}>
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {text}
      </Markdown>
    </div>
  );
}

function TextRenderer({ text }: RendererProps) {
  return <pre className={styles['text']}>{text}</pre>;
}

function JsonValue({ name, value, depth }: { name?: string; value: unknown; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isExpandable = typeof value === 'object' && value !== null;

  if (!isExpandable) {
    const scalarClass =
      value === null ? 'json-null' : (`json-${typeof value}` as 'json-string' | 'json-number' | 'json-boolean');
    const display = typeof value === 'string' ? `"${value}"` : String(value);
    return (
      <div className={styles['json-row']}>
        <span className={styles['json-toggle']} />
        {name !== undefined && <span className={styles['json-key']}>{name}:</span>}
        <span className={styles[scalarClass]}>{display}</span>
      </div>
    );
  }

  const entries: [string, unknown][] = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value as Record<string, unknown>);
  const bracket = Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`;

  return (
    <div>
      <div className={`${styles['json-row']} ${styles['json-row--expandable']}`} onClick={() => setOpen((o) => !o)}>
        <span className={styles['json-toggle']}>{open ? '▾' : '▸'}</span>
        {name !== undefined && <span className={styles['json-key']}>{name}:</span>}
        <span className={styles['json-bracket']}>{bracket}</span>
      </div>
      {open && (
        <div className={styles['json-children']}>
          {entries.map(([key, child]) => (
            <JsonValue key={key} name={Array.isArray(value) ? undefined : key} value={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function JsonRenderer({ text, data }: RendererProps) {
  const value = parseOr(text, data);
  if (value === undefined) {
    return <pre className={styles['text']}>{text}</pre>;
  }
  return (
    <div className={styles['json']}>
      <JsonValue value={value} depth={0} />
    </div>
  );
}

function TableRenderer({ text, data }: RendererProps) {
  const rows = parseOr(text, data);
  if (!Array.isArray(rows) || rows.length === 0) {
    return <pre className={styles['text']}>{text}</pre>;
  }

  const objectRows = rows.every((row) => row !== null && typeof row === 'object' && !Array.isArray(row));
  const headers = objectRows
    ? [...new Set(rows.flatMap((row) => Object.keys(row as Record<string, unknown>)))]
    : ['value'];

  return (
    <table className={styles['table']}>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {objectRows ? (
              headers.map((header) => (
                <td key={header}>
                  <RichText value={formatCell((row as Record<string, unknown>)[header])} />
                </td>
              ))
            ) : (
              <td>
                <RichText value={formatCell(row)} />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatCardsRenderer({ text, data }: RendererProps) {
  const value = parseOr(text, data);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return <pre className={styles['text']}>{text}</pre>;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  return (
    <div className={styles['stats']}>
      {entries.map(([key, entryValue]) => (
        <div key={key} className={styles['stat-card']}>
          <div className={styles['stat-value']}>
            <RichText value={formatCell(entryValue)} />
          </div>
          <div className={styles['stat-label']}>{humanize(key)}</div>
        </div>
      ))}
    </div>
  );
}

// Resolve a renderer to its component. `chart` (recharts) and `diagram` (mermaid)
// are lazy and load only when actually used.
export function getRenderer(renderer: VisualizeRenderer): ComponentType<RendererProps> {
  switch (renderer) {
    case 'text': {
      return TextRenderer;
    }
    case 'json': {
      return JsonRenderer;
    }
    case 'table': {
      return TableRenderer;
    }
    case 'stat-cards': {
      return StatCardsRenderer;
    }
    case 'chart': {
      return ChartRenderer;
    }
    case 'diagram': {
      return DiagramRenderer;
    }
    default: {
      return MarkdownRenderer;
    }
  }
}
