import { Switch } from '@workflowbuilder/ui';

import { useIsControlEditable } from '../../hooks/use-is-control-editable';
import type { SwitchControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function SwitchControl(props: SwitchControlProps) {
  const { data, handleChange, path } = props;
  const isEditable = useIsControlEditable(props);

  function onChange(checked: boolean) {
    handleChange(path, checked);
  }

  return (
    <ControlWrapper {...props}>
      <Switch disabled={!isEditable} size="medium" checked={data ?? false} onChange={onChange} />
    </ControlWrapper>
  );
}

export const switchControlRenderer = createControlRenderer('Switch', SwitchControl);
