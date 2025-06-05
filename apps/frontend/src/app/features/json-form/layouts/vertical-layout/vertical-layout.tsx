import styles from './vertical-layout.module.css';
import { LayoutWrapper } from '../layout-wrapper';
import { renderElements } from '../render-elements';
import { LayoutProps, VerticalLayoutElement } from '../../types/layouts';
import { createLayoutRenderer } from '../../utils/rendering';

function VerticalLayout(props: LayoutProps<VerticalLayoutElement>) {
  return (
    <LayoutWrapper {...props}>
      <div className={styles['horizontal-layout']}>{renderElements(props)}</div>
    </LayoutWrapper>
  );
}

export const verticalLayoutRenderer = createLayoutRenderer('VerticalLayout', VerticalLayout);
