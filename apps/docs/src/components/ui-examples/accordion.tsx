import { Accordion } from '@workflowbuilder/ui';

import frame from './example-frame.module.css';

export function AccordionExample() {
  return (
    <div className={frame.frame}>
      <div className={frame.stack}>
        <Accordion label="What is @workflowbuilder/ui?" defaultOpen>
          Our component library, built on Base UI.
        </Accordion>
        <Accordion label="Can I theme it?" defaultOpen={false}>
          Yes - override the --ax-* design tokens.
        </Accordion>
      </div>
    </div>
  );
}
