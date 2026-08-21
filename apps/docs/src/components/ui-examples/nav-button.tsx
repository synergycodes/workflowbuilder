import { ArrowRight, House, Plus } from '@phosphor-icons/react';
import { NAV_BUTTON_SIZES, NavButton } from '@workflowbuilder/ui';

import styles from './nav-button.module.css';

import { ComponentPreview } from './component-preview';

export function NavButtonExample() {
  return (
    <ComponentPreview>
      <div className={styles['rows']}>
        <div className={styles['row']}>
          <NavButton prefixIcon={<House />}>Square</NavButton>
          <NavButton styleVariant="round" prefixIcon={<House />}>
            Round
          </NavButton>
          <NavButton styleVariant="plain" prefixIcon={<House />}>
            Plain
          </NavButton>
          <NavButton isSelected prefixIcon={<House />} suffixIcon={<ArrowRight />}>
            Selected
          </NavButton>
        </div>
        <div className={styles['row']}>
          {NAV_BUTTON_SIZES.map((size) => (
            <NavButton key={size} aria-label={`Add (${size})`} size={size} prefixIcon={<Plus />} />
          ))}
        </div>
      </div>
    </ComponentPreview>
  );
}
