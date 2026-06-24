import { Accordion } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function AccordionExample() {
  return (
    <ComponentPreview>
      <Accordion label="What is @workflowbuilder/ui?" defaultOpen>
        Our component library, built on Base UI.
      </Accordion>
    </ComponentPreview>
  );
}
