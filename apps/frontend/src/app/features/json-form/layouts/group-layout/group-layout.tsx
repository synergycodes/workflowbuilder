import clsx from 'clsx';

import styles from './group-layout.module.css';

import { GroupLayoutElement, LayoutProps } from '../../types/layouts';
import { createLayoutRenderer } from '../../utils/rendering';
import { LayoutWrapper } from '../layout-wrapper';
import { renderElements } from '../render-elements';

function GroupLayout(props: LayoutProps<GroupLayoutElement>) {
  const { uischema } = props;

  return (
    <LayoutWrapper {...props}>
      <div className={styles['group-layout']}>
        <h1 className={clsx(styles['group-header'], 'ax-public-h10')}>{uischema.label}</h1>
        {renderElements(props)}
      </div>
    </LayoutWrapper>
  );
}

export const groupLayoutRenderer = createLayoutRenderer('Group', GroupLayout);
