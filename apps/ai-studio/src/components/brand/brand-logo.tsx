import styles from './brand-logo.module.css';

// The CDN's `-solid` asset bakes in a white background (a white box in dark
// mode), so we use the transparent dark-text / white-text variants of the same
// logo and swap them by the active SDK theme (see brand-logo.module.css).
const LOGO_LIGHT = 'https://cdn.synergycodes.com/workflow-builder-logo.svg';
const LOGO_DARK = 'https://cdn.synergycodes.com/workflow-builder-logo-white.svg';
const LOGO_HREF = 'https://workflowbuilder.io';

// Temporary consumer-side replacement for the SDK app-bar logo (the SDK one is
// hidden via brand-override.css). Renders the CDN logo over the app bar's logo
// slot and links it to workflowbuilder.io. Replace with an SDK logo/logoHref
// prop on <WorkflowBuilder.Root> when one is available.
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
