import mermaid from 'mermaid';
import { useEffect, useState } from 'react';

import styles from './renderers.module.css';

import type { RendererProps } from './renderers';

mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });

let counter = 0;

// Validate before render: invalid input falls back to raw text so mermaid never injects its "Syntax error" graphic.
export function DiagramRenderer({ text, data }: RendererProps) {
  const raw = typeof data === 'string' ? data : text;
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
