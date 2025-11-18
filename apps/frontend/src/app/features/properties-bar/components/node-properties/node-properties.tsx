import { WorkflowBuilderNode } from 'apps/types/src/node-data';
import useStore from '@/store/store';
import { JsonFormsReactProps } from '@jsonforms/react';
import { JSONForm } from '@/features/json-form/json-form';
import { JsonFormsProps } from '@jsonforms/core';
import { isDeepEqual } from 'remeda';
import { memo } from 'react';
import { trackFutureChange } from '@/features/changes-tracker/stores/use-changes-tracker-store';
import { flatErrors } from '@/utils/validation/flat-errors';

type Props = {
  node: WorkflowBuilderNode;
};

export const NodeProperties = memo(({ node }: Props) => {
  const getNodeDefinition = useStore((state) => state.getNodeDefinition);
  const setNodeProperties = useStore((state) => state.setNodeProperties);
  const isReadOnlyMode = useStore((state) => state.isReadOnlyMode);

  const { data, id } = node;
  const { properties, type } = data;

  const nodeDefinition = getNodeDefinition(type);
  if (!nodeDefinition) {
    return;
  }

  const { schema, uischema } = nodeDefinition;

  const onChange: JsonFormsReactProps['onChange'] = ({ data, errors }) => {
    const flattenErrors = flatErrors(errors);

    if (!isDeepEqual({ ...data, errors: flattenErrors }, properties)) {
      trackFutureChange('dataUpdate');
      setNodeProperties(id, { ...data, errors: flattenErrors });
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
