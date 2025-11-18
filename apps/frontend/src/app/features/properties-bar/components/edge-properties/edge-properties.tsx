import { WorkflowBuilderEdge } from 'apps/types/src/node-data';
import useStore from '@/store/store';
import { Input } from '@synergycodes/overflow-ui';
import styles from './edge-properties.module.css';
import { useEffect, useState } from 'react';
import { FormControlWithLabel } from '@/components/form/form-control-with-label/form-control-with-label';
import { OptionalEdgeProperties } from '@/features/plugins-core/components/optional-edge-properties';

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
