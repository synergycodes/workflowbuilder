import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './component-preview.module.css';

import previewCss from '../../../../../packages/ui/tmp/docs-preview.css?raw';

// Examples render in a shadow root so Starlight's rules cannot reach them and
// the library's cannot leak out. Inherited and custom properties still cross
// the boundary - that is how the docs theme reaches the examples. Inside a
// shadow root `:root` matches nothing, hence the retarget to `:host`.
// The boundary also stops the docs' own stylesheets, so example layout lives
// here as `Stack` and `Row` rather than in per-example CSS modules.
const shadowCss = `${previewCss.replaceAll(':root', ':host')}
:host > :not(style) { max-width: 100%; }
.stack { display: flex; flex-direction: column; gap: var(--wb-ds-space-150); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--wb-ds-space-100); }`;

function Stack({ children }: { children: ReactNode }) {
  return <div className="stack">{children}</div>;
}

function Row({ children }: { children: ReactNode }) {
  return <div className="row">{children}</div>;
}

export function ComponentPreview({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || shadow) return;
    const root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = shadowCss;
    root.append(style);
    setShadow(root);
  }, [shadow]);

  return (
    <div className={styles.stage}>
      <div className={styles.spotlight}>
        <div ref={hostRef} className={styles.host}>
          {shadow ? createPortal(children, shadow) : null}
        </div>
      </div>
    </div>
  );
}

ComponentPreview.Stack = Stack;
ComponentPreview.Row = Row;
