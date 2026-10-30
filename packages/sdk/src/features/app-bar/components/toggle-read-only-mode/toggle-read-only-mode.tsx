import { PencilSimple, PencilSimpleSlash } from '@phosphor-icons/react';
import { IconSwitch } from '@workflowbuilder/ui';

import { useStore } from '../../../../store/store';

export function ToggleReadyOnlyMode() {
  const isReadOnly = useStore((store) => store.isReadOnly);
  const setReadOnly = useStore((store) => store.setReadOnly);

  return (
    <IconSwitch
      checked={isReadOnly}
      onChange={setReadOnly}
      icon={<PencilSimple />}
      IconChecked={<PencilSimpleSlash />}
    />
  );
}
