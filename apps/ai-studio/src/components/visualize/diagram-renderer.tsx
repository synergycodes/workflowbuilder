import mermaid from 'mermaid';
import { useEffect, useState } from 'react';

import styles from './renderers.module.css';

import type { RendererProps } from './renderers';

mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });

let counter = 0;

// Renders a mermaid source string to SVG in the browser. On a syntax error it
// falls back to showing the raw source as text rather than breaking the card.
export function DiagramRenderer({ text, data }: RendererProps) {
  const source = typeof data === 'string' ? data : text;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    counter += 1;
    setSvg(null);
    setFailed(false);
    mermaid.render(`viz-mermaid-${counter}`, source).then(
      (result) => {
        if (!cancelled) {
          setSvg(result.svg);
        }
      },
      () => {
        if (!cancelled) {
          setFailed(true);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (failed) {
    return <pre className={styles['text']}>{text}</pre>;
  }
  if (svg === null) {
    return <p className={styles['empty-text']}>Rendering diagram…</p>;
  }
  // mermaid output, sanitized via securityLevel 'strict'
  return <div className={styles['diagram']} dangerouslySetInnerHTML={{ __html: svg }} />;
}
