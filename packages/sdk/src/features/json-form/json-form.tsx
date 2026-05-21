import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { type ComponentProps, useMemo } from 'react';

import styles from './json-form.module.css';

import { workflowBuilderValidator } from '../../utils/validation/workflow-builder-validator';
import { aiToolsControlRenderer } from './controls/ai-tools-control/ai-tools-control';
import { datePickerControlRenderer } from './controls/date-picker-control/date-picker-control';
import { decisionBranchesControlRenderer } from './controls/decision-branches-control/decision-branches-control';
import { dynamicConditionsControlRenderer } from './controls/dynamic-conditions-control/dynamic-conditions-control';
import { labelRenderer } from './controls/label-control/label-control';
import { messageOnErrorControlRenderer } from './controls/message-on-error-control/message-on-error-control';
import { richTextRenderer } from './controls/rich-text-control/rich-text-control';
import { selectControlRenderer } from './controls/select-control/select-control';
import { switchControlRenderer } from './controls/switch-control/switch-control';
import { textAreaControlRenderer } from './controls/text-area-control/text-area-control';
import { textControlRenderer } from './controls/text-control/text-control';
import { variableTextAreaControlRenderer } from './controls/variable-text-area-control/variable-text-area-control';
import { variableTextControlRenderer } from './controls/variable-text-control/variable-text-control';
import { getCustomCells, getCustomRenderers } from './extension-registry';
import { accordionLayoutRenderer } from './layouts/accordion-layout/accordion-layout';
import { groupLayoutRenderer } from './layouts/group-layout/group-layout';
import { horizontalLayoutRenderer } from './layouts/horizontal-layout/horizontal-layout';
import { verticalLayoutRenderer } from './layouts/vertical-layout/vertical-layout';
import { unknownRenderer } from './utils/unknown-renderer';

type Props = Pick<
  ComponentProps<typeof JsonForms>,
  'onChange' | 'data' | 'uischema' | 'schema' | 'additionalErrors'
> & {
  readonly?: boolean;
};

export function JSONForm(props: Props) {
  const { readonly, ...rest } = props;
  // Consumer-supplied renderers are placed BEFORE builtins so they can override
  // built-in testers on ties (JsonForms picks the first matching tester-rank).
  const renderers = useMemo(() => [...getCustomRenderers(), ...builtinRenderers], []);
  const cells = useMemo(() => getCustomCells(), []);
  return (
    <div className={styles['json-form-container']}>
      <JsonForms
        renderers={renderers}
        cells={cells.length > 0 ? cells : undefined}
        validationMode="ValidateAndShow"
        ajv={workflowBuilderValidator}
        {...rest}
        config={{ readonly }}
      />
    </div>
  );
}

const builtinRenderers: JsonFormsRendererRegistryEntry[] = [
  unknownRenderer,
  accordionLayoutRenderer,
  textControlRenderer,
  groupLayoutRenderer,
  verticalLayoutRenderer,
  horizontalLayoutRenderer,
  switchControlRenderer,
  labelRenderer,
  richTextRenderer,
  selectControlRenderer,
  datePickerControlRenderer,
  textAreaControlRenderer,
  dynamicConditionsControlRenderer,
  aiToolsControlRenderer,
  decisionBranchesControlRenderer,
  variableTextControlRenderer,
  variableTextAreaControlRenderer,
  messageOnErrorControlRenderer,
];
