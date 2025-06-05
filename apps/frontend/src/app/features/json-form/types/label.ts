import { LabelProps } from '@/components/form/label/label';
import { Override } from './utils';
import { LabelElement as BaseLabelElement } from '@jsonforms/core';

export type LabelElement = Override<BaseLabelElement, Omit<LabelProps, 'label'>>;
