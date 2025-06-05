import clsx from 'clsx';

import styles from './group-layout.module.css';
import { LayoutWrapper } from '../layout-wrapper';
import { GroupLayoutElement, LayoutProps } from '../../types/layouts';
import { renderElements } from '../render-elements';
import { createLayoutRenderer } from '../../utils/rendering';

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
