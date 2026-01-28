import { Input } from '@synergycodes/overflow-ui';
import { useEffect, useState } from 'react';

import { WorkflowBuilderEdge } from '@workflow-builder/types/node-data';

import styles from './edge-properties.module.css';

import useStore from '@/store/store';

import { FormControlWithLabel } from '@/components/form/form-control-with-label/form-control-with-label';

import { OptionalEdgeProperties } from '@/features/plugins-core/components/app/optional-edge-properties';

type Props = {
  edge: WorkflowBuilderEdge;
};

export function EdgeProperties({ edge }: Props) {
  const { data = {}, id } = edge;
  const { label } = data;

  const setEdgeData = useStore((state) => state.setEdgeData);
  const isReadOnlyMode = useStore((state) => state.isReadOnlyMode);

  const [input, setInput] = useState(label);

  useEffect(() => {
    setInput(label);
  }, [label]);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const { value } = event.target;
    setInput(value);
    setEdgeData(id, { label: value });
  };

  return (
    <div className={styles['container']}>
      <OptionalEdgeProperties>
        <FormControlWithLabel label="Label">
          <Input value={input || ''} onChange={onChange} disabled={isReadOnlyMode} />
        </FormControlWithLabel>
      </OptionalEdgeProperties>
    </div>
  );
}
