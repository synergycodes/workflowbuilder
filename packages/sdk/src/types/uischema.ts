import {
  type AiToolsControlElement,
  type DatePickerControlElement,
  type DecisionBranchesControlElement,
  type DynamicConditionsControlElement,
  type MessageOnErrorControlElement,
  type SelectControlElement,
  type SwitchControlElement,
  type TextAreaControlElement,
  type TextControlElement,
  type VariableTextAreaControlElement,
  type VariableTextControlElement,
} from './controls';
import type { LabelElement, RichTextElement } from './labels';
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

/**
 * JsonForms-compatible UI schema describing how a node's properties are
 * rendered in the property panel — controls (Text, Switch, Select,
 * DynamicConditions, …), layouts (Vertical, Horizontal, Group,
 * Accordion), and labels.
 *
 * Pair with {@link NodeSchema} to drive both validation and rendering
 * from a single declarative source.
 *
 * @category Types
 */
export type UISchema = UISchemaElement;
