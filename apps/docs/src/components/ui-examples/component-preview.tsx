import componentCss from '@workflowbuilder/ui/index.css?raw';
import globalCss from '@workflowbuilder/ui/styles.css?raw';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './component-preview.module.css';

// Render examples inside a shadow root so Starlight's stylesheet RULES cannot
// reach the components (and the library's cannot leak out) - the same
// isolation the original Overflow UI docs use. Inherited properties
// (typography, color) and custom properties still cross the shadow boundary
// by design: that is how the docs theme (`--ax-*` per data-theme) reaches the
// examples, and why a preview is close to - not pixel-identical with - a
// consumer app that inherits different page styles.
//
// Inside a shadow root `:root` matches nothing, so retarget the library's
// root-scoped custom-property defaults to `:host`. The stage has a fixed
// max width, so oversized examples (Snackbar) shrink instead of clipping.
const shadowCss = `${`${globalCss}\n${componentCss}`.replaceAll(':root', ':host')}
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
