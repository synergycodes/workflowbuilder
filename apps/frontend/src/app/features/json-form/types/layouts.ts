import type { LayoutProps as JSONFormsLayoutProps, Layout } from '@jsonforms/core';

import { UISchemaRule } from './rules';
import type { UISchemaElement } from './uischema';
import type { Override } from './utils';

export type AccordionLayoutElement = Override<
  BaseLayoutElement,
  {
    label: string;
    type: 'Accordion';
  }
>;

export type GroupLayoutElement = Override<
  BaseLayoutElement,
  {
    label: string;
    type: 'Group';
  }
>;

export type VerticalLayoutElement = Override<
  BaseLayoutElement,
  {
    type: 'VerticalLayout';
  }
>;

export type HorizontalLayoutElement = Override<
  BaseLayoutElement,
  {
    type: 'HorizontalLayout';
  } & {
    /**
     * Defines the `grid-auto-columns` CSS property.
     * Can be any valid CSS value for the `grid-auto-columns` property:
     * - Length (e.g., '100px 1fr')
     * - Percentage (e.g., '50%')
     * - 'auto'
     */
    layoutColumns?: string;
  }
>;
export type LayoutProps<T extends BaseLayoutElement> = Override<
  JSONFormsLayoutProps,
  {
    children: React.ReactNode;
    uischema: T;
  }
>;

export type BaseLayoutElement = Override<
  Layout,
  {
    rule?: UISchemaRule;
    elements: UISchemaElement[];
  }
>;
