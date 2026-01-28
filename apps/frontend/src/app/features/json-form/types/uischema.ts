import {
  AiToolsControlElement,
  DatePickerControlElement,
  DecisionBranchesControlElement,
  DynamicConditionsControlElement,
  SelectControlElement,
  SwitchControlElement,
  TextAreaControlElement,
  TextControlElement,
} from './controls';
import { LabelElement } from './label';
import type {
  AccordionLayoutElement,
  GroupLayoutElement,
  HorizontalLayoutElement,
  VerticalLayoutElement,
} from './layouts';

export type UISchemaControlElement<T extends string = string> = (
  | TextControlElement
  | SwitchControlElement
  | SelectControlElement
  | DatePickerControlElement
  | TextAreaControlElement
  | DynamicConditionsControlElement
  | AiToolsControlElement
  | DecisionBranchesControlElement
) & { scope: T; errorIndicatorEnabled?: boolean };
export type UISchemaControlElementType = UISchemaControlElement['type'];

type UISchemaLayoutElement =
  | GroupLayoutElement
  | AccordionLayoutElement
  | VerticalLayoutElement
  | HorizontalLayoutElement;
export type UISchemaLayoutElementType = UISchemaLayoutElement['type'];

export type UISchemaElement<T extends string = string> =
  | UISchemaControlElement<T>
  | UISchemaLayoutElement
  | LabelElement;
export type UISchemaElementType = UISchemaElement['type'];

export type UISchema = UISchemaElement;
