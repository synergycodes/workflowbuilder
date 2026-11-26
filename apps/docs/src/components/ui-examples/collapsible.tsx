import { Collapsible } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function CollapsibleExample() {
  return (
    <ComponentPreview>
      <Collapsible defaultOpen>
        <Collapsible.Button />
        <Collapsible.Content>Additional details go here.</Collapsible.Content>
      </Collapsible>
    </ComponentPreview>
  );
}
