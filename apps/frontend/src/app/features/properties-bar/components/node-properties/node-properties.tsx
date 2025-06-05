import { WorkflowBuilderNode } from 'apps/types/src/node-data';
import useStore from '@/store/store';
import { JsonFormsReactProps } from '@jsonforms/react';
import { JSONForm } from '@/features/json-form/json-form';
import { JsonFormsProps } from '@jsonforms/core';
import { isDeepEqual } from 'remeda';
import { memo, useContext } from 'react';
import { UndoRedoContext } from '@/providers/undo-redo-provider';

type Props = {
  node: WorkflowBuilderNode;
};

export const NodeProperties = memo(({ node }: Props) => {
  const getNodeDefinition = useStore((state) => state.getNodeDefinition);
  const setNodeProperties = useStore((state) => state.setNodeProperties);
  const isReadOnlyMode = useStore((state) => state.isReadOnlyMode);

  const { takeSnapshot } = useContext(UndoRedoContext);

  const { data, id } = node;
  const { properties, type } = data;

  const nodeDefinition = getNodeDefinition(type);
  if (!nodeDefinition) {
    return;
  }

  const { schema, uischema } = nodeDefinition;

  const onChange: JsonFormsReactProps['onChange'] = ({ data, errors }) => {
    /// TODO: Use `errors` to update the validation status of the entire form
    console.log(errors, 'errors');

    if (!isDeepEqual(data, properties)) {
      takeSnapshot();
      setNodeProperties(id, data);
    }
  };

  return (
    <JSONForm
      data={properties}
      schema={schema}
      uischema={uischema as JsonFormsProps['uischema']}
      onChange={onChange}
      readonly={isReadOnlyMode}
    />
  );
});
