import { truncate } from '../../../../../utils/text';
import type { VariableInListWithReference } from '../../../../json-form/controls/variables-list-control/types';
import type { VariableSuggestion } from '../../../components/variable-text/variable-text.types';
import { VARIABLE_DELIMITER } from '../../../constants';
import { getVariableReferenceWithoutBracketsForNode } from '../../../utils/keys/get-variable-reference-without-brackets-for-node';

const NODE_PROPERTIES_KEY = 'properties';

type Params = {
  /** Path of the list inside `node.data.properties`, e.g. `editableFields`. */
  propertyPath: string;
  variablesList: VariableInListWithReference[];
  nodeId: string;
  nodeLabel: string;
};

/**
 * Produces suggestions from a variables-list control value. Each entry resolves to
 * `nodes.<nodeId>.properties.<propertyPath>.<index>`: its position in the authored list, not the picked reference.
 */
export const getSuggestionsFromVariablesList = ({
  propertyPath,
  variablesList,
  nodeId,
  nodeLabel,
}: Params): VariableSuggestion[] =>
  variablesList.map((variable, index) => ({
    id: getVariableReferenceWithoutBracketsForNode({
      nodeId,
      propertyName: [NODE_PROPERTIES_KEY, propertyPath, index].join('.'),
    }),
    display: [truncate(nodeLabel, 15), truncate(variable.label, 15)].filter(Boolean).join(VARIABLE_DELIMITER),
    label: variable.label,
    type: variable.type,
  }));
