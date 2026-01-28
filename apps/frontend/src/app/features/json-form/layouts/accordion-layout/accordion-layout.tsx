import { Accordion } from '@synergycodes/overflow-ui';

import styles from './accordion-layout.module.css';

import { AccordionLayoutElement, LayoutProps } from '../../types/layouts';
import { createLayoutRenderer } from '../../utils/rendering';
import { LayoutWrapper } from '../layout-wrapper';
import { renderElements } from '../render-elements';

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
