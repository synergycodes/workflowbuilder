import componentCss from '@workflowbuilder/ui/index.css?raw';
import globalCss from '@workflowbuilder/ui/styles.css?raw';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './component-preview.module.css';

// Render examples inside a shadow root so the components are styled ONLY by
// `@workflowbuilder/ui`, isolated from the Starlight docs CSS (and vice versa) -
// the same isolation the original Overflow UI docs use, so previews are faithful.
//
// Inside a shadow root `:root` matches nothing, so retarget the library's
// root-scoped custom-property defaults to `:host`. The `--ax-*` design tokens
// still inherit in from the document (tokens.css defines them per data-theme),
// because custom properties cross the shadow boundary.
const shadowCss = `${globalCss}\n${componentCss}`.replaceAll(':root', ':host');

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
