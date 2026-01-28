import { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { ComponentProps } from 'react';

import styles from './json-form.module.css';

import { aiToolsControlRenderer } from './controls/ai-tools-control/ai-tools-control';
import { datePickerControlRenderer } from './controls/date-picker-control/date-picker-control';
import { decisionBranchesControlRenderer } from './controls/decision-branches-control/decision-branches-control';
import { dynamicConditionsControlRenderer } from './controls/dynamic-conditions-control/dynamic-conditions-control';
import { labelRenderer } from './controls/label-control/label-control';
import { selectControlRenderer } from './controls/select-control/select-control';
import { switchControlRenderer } from './controls/switch-control/switch-control';
import { textAreaControlRenderer } from './controls/text-area-control/text-area-control';
import { textControlRenderer } from './controls/text-control/text-control';
import { accordionLayoutRenderer } from './layouts/accordion-layout/accordion-layout';
import { groupLayoutRenderer } from './layouts/group-layout/group-layout';
import { horizontalLayoutRenderer } from './layouts/horizontal-layout/horizontal-layout';
import { verticalLayoutRenderer } from './layouts/vertical-layout/vertical-layout';
import { unknownRenderer } from './utils/unknown-renderer';

type Props = Pick<ComponentProps<typeof JsonForms>, 'onChange' | 'data' | 'uischema' | 'schema'> & {
  readonly?: boolean;
};

export function JSONForm(props: Props) {
  const { readonly, ...rest } = props;
  return (
    <div className={styles['json-form-container']}>
      <JsonForms renderers={renderers} validationMode="ValidateAndShow" {...rest} config={{ readonly }} />
    </div>
  );
}

const renderers: JsonFormsRendererRegistryEntry[] = [
  unknownRenderer,
  accordionLayoutRenderer,
  textControlRenderer,
  groupLayoutRenderer,
  verticalLayoutRenderer,
  horizontalLayoutRenderer,
  switchControlRenderer,
  labelRenderer,
  selectControlRenderer,
  datePickerControlRenderer,
  textAreaControlRenderer,
  dynamicConditionsControlRenderer,
  aiToolsControlRenderer,
  decisionBranchesControlRenderer,
];
