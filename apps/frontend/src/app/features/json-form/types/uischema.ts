import {
  AiToolsControlElement,
  DatePickerControlElement,
  DecisionBranchesControlElement,
  DynamicConditionsControlElement,
  MessageOnErrorControlElement,
  SelectControlElement,
  SwitchControlElement,
  TextAreaControlElement,
  TextControlElement,
  VariableTextAreaControlElement,
  VariableTextControlElement,
} from './controls';
import { LabelElement, RichTextElement } from './labels';
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
  | VariableTextControlElement
  | VariableTextAreaControlElement
  | MessageOnErrorControlElement
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
  | LabelElement
  | RichTextElement;
export type UISchemaElementType = UISchemaElement['type'];

export type UISchema = UISchemaElement;
