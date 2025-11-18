import { Switch } from '@synergycodes/overflow-ui';
import { SwitchControlProps } from '../../types/controls';
import { createControlRenderer } from '../../utils/rendering';
import { ControlWrapper } from '../control-wrapper';

function SwitchControl(props: SwitchControlProps) {
  const { data, handleChange, path, enabled } = props;

  function onChange(checked: boolean, _event: React.ChangeEvent<HTMLInputElement>) {
    handleChange(path, checked);
  }

  return (
    <ControlWrapper {...props}>
      <Switch disabled={!enabled} size="medium" checked={data ?? false} onChange={onChange} />
    </ControlWrapper>
  );
}

export const switchControlRenderer = createControlRenderer('Switch', SwitchControl);
