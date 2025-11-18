import { Accordion } from '@synergycodes/overflow-ui';
import { AccordionLayoutElement, LayoutProps } from '../../types/layouts';
import { LayoutWrapper } from '../layout-wrapper';
import { createLayoutRenderer } from '../../utils/rendering';
import { renderElements } from '../render-elements';

import styles from './accordion-layout.module.css';

function AccordionLayout(props: LayoutProps<AccordionLayoutElement>) {
  const { uischema } = props;

  return (
    <LayoutWrapper {...props}>
      <Accordion label={uischema.label}>
        <div className={styles['accordion-content']}>{renderElements(props)}</div>
      </Accordion>
    </LayoutWrapper>
  );
}

export const accordionLayoutRenderer = createLayoutRenderer('Accordion', AccordionLayout);
