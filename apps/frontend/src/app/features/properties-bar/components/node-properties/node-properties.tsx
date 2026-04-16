import { JsonFormsProps } from '@jsonforms/core';
import { JsonFormsReactProps } from '@jsonforms/react';
import { memo } from 'react';
import { isDeepEqual } from 'remeda';

import { StatusType } from '@workflow-builder/types/common';
import { WorkflowBuilderNode } from '@workflow-builder/types/node-data';

import { filterOutEdgesBySourceHandles } from '@/utils/edges/filter-out-edges-by-source-handles';
import { flatErrors } from '@/utils/validation/flat-errors';

import { getStoreEdges, setStoreEdges } from '@/store/slices/diagram-slice/actions';
import useStore from '@/store/store';

import { trackFutureChange } from '@/features/changes-tracker/stores/use-changes-tracker-store';
import { JSONForm } from '@/features/json-form/json-form';

/**
 * When a property change removes source handles (e.g. deleting an AI tool or decision branch),
 * clean up any edges that were connected to those handles.
 * This is done here centrally so it counts as a single undo step together with the data update.
 */
function removeEdgesForDeletedHandles(oldProperties: unknown, newProperties: unknown) {
  const oldHandles = new Set(collectSourceHandles(oldProperties));
  const newHandles = new Set(collectSourceHandles(newProperties));
  const removedHandles = [...oldHandles].filter((h) => !newHandles.has(h));

  if (removedHandles.length > 0) {
    const edges = getStoreEdges();
    const updatedEdges = filterOutEdgesBySourceHandles(edges, removedHandles);
    setStoreEdges(updatedEdges);
  }
}

function collectSourceHandles(object: unknown): string[] {
  const handles: string[] = [];

  function walk(value: unknown) {
    if (value === null || value === undefined || typeof value !== 'object') return;

    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }

    const record = value as Record<string, unknown>;
    for (const key in record) {
      if (key === 'sourceHandle' && typeof record[key] === 'string') {
        handles.push(record[key]);
      } else {
        walk(record[key]);
      }
    }
  }

  walk(object);
  return handles;
}

type Props = {
  node: WorkflowBuilderNode;
};

export const NodeProperties = memo(({ node }: Props) => {
  const fetchStatus = useStore((state) => state.fetchDataStatus);
  const getNodeDefinition = useStore((state) => state.getNodeDefinition);
  const setNodeProperties = useStore((state) => state.setNodeProperties);
  const isReadOnlyMode = useStore((state) => state.isReadOnlyMode);

  const { data, id } = node;
  const { properties, type } = data;

  const nodeDefinition = getNodeDefinition(type);
  if (!nodeDefinition || fetchStatus === StatusType.Loading) {
    return;
  }

  const { schema, uischema } = nodeDefinition;
  const onChange: JsonFormsReactProps['onChange'] = ({ data, errors }) => {
    const flattenErrors = flatErrors(errors);

    if (!isDeepEqual({ ...data, errors: flattenErrors }, properties)) {
      trackFutureChange('dataUpdate');
      setNodeProperties(id, { ...data, errors: flattenErrors });

      removeEdgesForDeletedHandles(properties, data);
    }
  };

  return (
    <JSONForm
      data={properties}
      schema={schema}
      uischema={uischema as JsonFormsProps['uischema']}
      onChange={onChange}
      readonly={isReadOnlyMode}
      additionalErrors={properties.customErrors}
    />
  );
});
