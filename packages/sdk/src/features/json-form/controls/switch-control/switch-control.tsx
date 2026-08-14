import { Switch } from '@workflowbuilder/ui';

import type { SwitchControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function SwitchControl(props: SwitchControlProps) {
  const { data, handleChange, path, enabled, uischema } = props;
  const isDisabled = !enabled || uischema.disabled === true;

  function onChange(checked: boolean) {
    handleChange(path, checked);
  }

  return (
    <ControlWrapper {...props}>
      <Switch disabled={isDisabled} size="medium" checked={data ?? false} onChange={onChange} />
    </ControlWrapper>
  );
}

export const switchControlRenderer = createControlRenderer('Switch', SwitchControl);
