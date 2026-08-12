import { isValidElement } from 'react';
import type { ReactNode } from 'react';

import styles from '../../app-bar.module.css';

import Logo from '../../../../assets/workflow-builder-logo.svg?react';
import { getAppBarBranding } from '../../../../data/app-bar-branding';
import type { WorkflowBuilderLogo } from '../../../../workflow-builder-root/workflow-builder-root.types';
import { SaveButton } from '../../../integration/components/save-button/save-button';
import { OptionalAppBarTools } from '../../../plugins-core/components/app/optional-app-bar-toolbar';

function renderLogo(logo: WorkflowBuilderLogo | undefined): ReactNode {
  if (logo == null) {
    return <Logo className={styles['logo']} />;
  }
  if (typeof logo === 'string') {
    return <img className={styles['logo-image']} src={logo} alt="" />;
  }
  if (!isValidElement(logo)) {
    return (
      <>
        <img className={`${styles['logo-image']} ${styles['logo-image--light']}`} src={logo.light} alt="" />
        <img className={`${styles['logo-image']} ${styles['logo-image--dark']}`} src={logo.dark} alt="" />
      </>
    );
  }
  return logo;
}

export function Toolbar() {
  const { logo: customLogo, logoHref } = getAppBarBranding();
  const logo = renderLogo(customLogo);

  return (
    <div className={styles['toolbar']}>
      {logoHref ? (
        <a className={styles['logo-link']} href={logoHref} target="_blank" rel="noreferrer noopener">
          {logo}
        </a>
      ) : (
        logo
      )}
      <div className={styles['nav-segment']}>
        <OptionalAppBarTools>
          <SaveButton />
        </OptionalAppBarTools>
      </div>
    </div>
  );
}
