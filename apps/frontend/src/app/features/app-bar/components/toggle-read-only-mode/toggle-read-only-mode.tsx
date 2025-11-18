import { IconSwitch } from '@synergycodes/overflow-ui';
import { PencilSimple, PencilSimpleSlash } from '@phosphor-icons/react';

import useStore from '@/store/store';

export function ToggleReadyOnlyMode() {
  const isReadOnlyMode = useStore((store) => store.isReadOnlyMode);
  const setToggleReadOnlyMode = useStore((store) => store.setToggleReadOnlyMode);

  return (
    <IconSwitch
      checked={isReadOnlyMode}
      onChange={setToggleReadOnlyMode}
      icon={<PencilSimple />}
      IconChecked={<PencilSimpleSlash />}
    />
  );
}
