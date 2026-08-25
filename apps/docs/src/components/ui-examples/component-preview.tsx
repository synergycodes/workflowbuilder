import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './component-preview.module.css';

import previewCss from '../../../../../packages/ui/dist/docs-preview.css?raw';

// Examples render in a shadow root so Starlight's rules cannot reach them and
// the library's cannot leak out. Inherited and custom properties still cross
// the boundary - that is how the docs theme reaches the examples. Inside a
// shadow root `:root` matches nothing, hence the retarget to `:host`.
const shadowCss = `${previewCss.replaceAll(':root', ':host')}
:host > :not(style) { max-width: 100%; }`;

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
