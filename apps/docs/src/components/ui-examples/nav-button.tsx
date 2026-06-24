import { NavButton } from '@workflowbuilder/ui';

import frame from './example-frame.module.css';

export function NavButtonExample() {
  return (
    <div className={frame.frame}>
      <NavButton>Default</NavButton>
      <NavButton isSelected>Selected</NavButton>
    </div>
  );
}
