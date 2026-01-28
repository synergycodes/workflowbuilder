import { JsonFormsProps } from '@jsonforms/core';
import { JsonFormsReactProps } from '@jsonforms/react';
import { memo } from 'react';
import { isDeepEqual } from 'remeda';

import { WorkflowBuilderNode } from '@workflow-builder/types/node-data';

import { flatErrors } from '@/utils/validation/flat-errors';

import useStore from '@/store/store';

import { trackFutureChange } from '@/features/changes-tracker/stores/use-changes-tracker-store';
import { JSONForm } from '@/features/json-form/json-form';

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
