import styles from './brand-logo.module.css';

// Transparent variants swapped by theme; the `-solid` CDN asset bakes in a white background.
const LOGO_LIGHT = 'https://cdn.synergycodes.com/workflow-builder-logo.svg';
const LOGO_DARK = 'https://cdn.synergycodes.com/workflow-builder-logo-white.svg';
const LOGO_HREF = 'https://workflowbuilder.io';

// Temporary: overlays the SDK app-bar logo (hidden via brand-override.css) until the SDK exposes a logo/logoHref prop.
export function BrandLogo() {
  return (
    <a
      className={styles['logo']}
      href={LOGO_HREF}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Workflow Builder - workflowbuilder.io"
    >
      <img className={`${styles['image']} ${styles['light']}`} src={LOGO_LIGHT} alt="Workflow Builder" />
      <img className={`${styles['image']} ${styles['dark']}`} src={LOGO_DARK} alt="" aria-hidden="true" />
    </a>
  );
}
