import type { LabelElement as BaseLabelElement } from '@jsonforms/core';
import type { ItemSize } from '@workflowbuilder/ui';

import type { LabelVariant } from '../components/form/label/label';
import type { Override } from './utils';

type LabelOwnProps = { required?: boolean; size?: ItemSize; variant?: LabelVariant };

export type LabelElement = Override<BaseLabelElement, LabelOwnProps>;

export type RichTextElement = Override<BaseLabelElement, LabelOwnProps & { type: 'RichText' }>;
