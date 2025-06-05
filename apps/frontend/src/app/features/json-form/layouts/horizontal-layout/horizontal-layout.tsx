import styles from './horizontal-layout.module.css';
import { LayoutWrapper } from '../layout-wrapper';
import { HorizontalLayoutElement, LayoutProps } from '../../types/layouts';
import { renderElements } from '../render-elements';
import { createLayoutRenderer } from '../../utils/rendering';
import { CSSProperties, useMemo } from 'react';
import { useHasChildError } from './use-has-child-error';

function HorizontalLayout(props: LayoutProps<HorizontalLayoutElement>) {
  const hasErrors = useHasChildError(props.uischema.elements);

  const { uischema } = props;
  const { layoutColumns } = uischema;

  const style: CSSProperties = useMemo(
    () => (layoutColumns ? { gridAutoColumns: layoutColumns } : {}),
    [layoutColumns],
  );

  return (
    <LayoutWrapper hasErrors={hasErrors} {...props}>
      <div style={style} className={styles['horizontal-layout']}>
        {renderElements(props)}
      </div>
    </LayoutWrapper>
  );
}

export const horizontalLayoutRenderer = createLayoutRenderer('HorizontalLayout', HorizontalLayout);
