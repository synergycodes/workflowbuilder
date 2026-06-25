import mermaid from 'mermaid';
import { useEffect, useState } from 'react';

import styles from './renderers.module.css';

import type { RendererProps } from './renderers';

mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });

let counter = 0;

// Renders a mermaid source string to SVG in the browser. It validates with
// mermaid.parse({ suppressErrors: true }) BEFORE rendering: invalid input (e.g.
// the node is forced to Diagram on non-diagram text) falls back to raw text and
// never calls render, so mermaid does not inject its giant "Syntax error"
// graphic into the document.
export function DiagramRenderer({ text, data }: RendererProps) {
  const raw = typeof data === 'string' ? data : text;
  // If the diagram is embedded in a larger response, render just the fenced block.
  const fence = /```mermaid\s*\n([\s\S]*?)```/.exec(raw);
  const source = fence ? fence[1].trim() : raw;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    counter += 1;
    setSvg(null);
    setFailed(false);

    const run = async () => {
      try {
        const isValid = await mermaid.parse(source, { suppressErrors: true });
        if (!isValid) {
          if (!cancelled) {
            setFailed(true);
          }
          return;
        }
        const { svg: rendered } = await mermaid.render(`viz-mermaid-${counter}`, source);
        if (!cancelled) {
          setSvg(rendered);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [source]);

  if (failed) {
    return (
      <div>
        <p className={styles['fallback-note']}>Not a valid Mermaid diagram — showing the raw text.</p>
        <pre className={styles['text']}>{text}</pre>
      </div>
    );
  }
  if (svg === null) {
    return <p className={styles['empty-text']}>Rendering diagram…</p>;
  }
  // mermaid output, sanitized via securityLevel 'strict'
  return <div className={styles['diagram']} dangerouslySetInnerHTML={{ __html: svg }} />;
}
