import { Input } from '@workflowbuilder/ui';
import { useEffect, useRef, useState } from 'react';

import styles from './edge-properties.module.css';

import { FormControlWithLabel } from '../../../../components/form/form-control-with-label/form-control-with-label';
import type { WorkflowBuilderEdge } from '../../../../node/node-data';
import { useStore } from '../../../../store/store';
import { trackFutureChange } from '../../../changes-tracker/stores/use-changes-tracker-store';
import { OptionalEdgeProperties } from '../../../plugins-core/components/app/optional-edge-properties';

type Props = {
  edge: WorkflowBuilderEdge;
};

export function EdgeProperties({ edge }: Props) {
  const { data = {}, id } = edge;
  const { label } = data;

  const setEdgeData = useStore((state) => state.setEdgeData);
  const isReadOnly = useStore((state) => state.isReadOnly);

  const [input, setInput] = useState(label);
  // One tracked change per focus session, so undo takes the whole edit back, not one character.
  const isChangeTrackedRef = useRef(false);

  useEffect(() => {
    setInput(label);
  }, [label]);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const { value } = event.target;
    setInput(value);

    if (!isChangeTrackedRef.current) {
      trackFutureChange('dataUpdateEdge', { id });
      isChangeTrackedRef.current = true;
    }

    setEdgeData(id, { label: value });
  };

  const onBlur = () => {
    isChangeTrackedRef.current = false;
  };

  return (
    <div className={styles['container']}>
      <OptionalEdgeProperties>
        <FormControlWithLabel label="Label">
          <Input value={input || ''} onChange={onChange} onBlur={onBlur} disabled={isReadOnly} />
        </FormControlWithLabel>
      </OptionalEdgeProperties>
    </div>
  );
}
