import { ArrowRight, House, Plus } from '@phosphor-icons/react';
import { NAV_BUTTON_SIZES, NavButton } from '@workflowbuilder/ui';

import { ComponentPreview } from './component-preview';

export function NavButtonExample() {
  return (
    <ComponentPreview>
      <ComponentPreview.Stack>
        <ComponentPreview.Row>
          <NavButton prefixIcon={<House />}>Square</NavButton>
          <NavButton variant="round" prefixIcon={<House />}>
            Round
          </NavButton>
          <NavButton aria-label="Plain" variant="plain" prefixIcon={<House />} />
          <NavButton isSelected prefixIcon={<House />} suffixIcon={<ArrowRight />}>
            Selected
          </NavButton>
        </ComponentPreview.Row>
        <ComponentPreview.Row>
          {NAV_BUTTON_SIZES.map((size) => (
            <NavButton key={size} aria-label={`Add (${size})`} size={size} prefixIcon={<Plus />} />
          ))}
        </ComponentPreview.Row>
      </ComponentPreview.Stack>
    </ComponentPreview>
  );
}
