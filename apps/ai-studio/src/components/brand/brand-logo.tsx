import styles from './brand-logo.module.css';

import logoDark from '../../assets/workflow-builder-logo-white.svg';
import logoLight from '../../assets/workflow-builder-logo.svg';

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
      <img className={`${styles['image']} ${styles['light']}`} src={logoLight} alt="Workflow Builder" />
      <img className={`${styles['image']} ${styles['dark']}`} src={logoDark} alt="" aria-hidden="true" />
    </a>
  );
}
