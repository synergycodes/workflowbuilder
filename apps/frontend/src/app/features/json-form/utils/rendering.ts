import { ControlProps, JsonFormsRendererRegistryEntry, rankWith, uiTypeIs } from '@jsonforms/core';
import { UISchemaControlElementType, UISchemaElementType, UISchemaLayoutElementType } from '../types/uischema';
import { BaseControlProps } from '../types/controls';
import { withJsonFormsControlProps, withJsonFormsLayoutProps } from '@jsonforms/react';
import { ComponentType } from 'react';
import { BaseLayoutElement, LayoutProps } from '../types/layouts';

const JSON_FORM_DEFAULT_RANK = 1;

export function createTester(type: UISchemaElementType) {
  return rankWith(JSON_FORM_DEFAULT_RANK, uiTypeIs(type));
}

export function createControlRenderer<T extends BaseControlProps = BaseControlProps>(
  type: UISchemaControlElementType,
  renderer: React.ComponentType<T>,
): JsonFormsRendererRegistryEntry {
  return {
    tester: createTester(type),
    renderer: withJsonFormsControlProps(renderer as unknown as ComponentType<ControlProps>),
  };
}

export function createLayoutRenderer<T extends LayoutProps<BaseLayoutElement>>(
  type: UISchemaLayoutElementType,
  renderer: React.ComponentType<T>,
): JsonFormsRendererRegistryEntry {
  return {
    tester: createTester(type),
    renderer: withJsonFormsLayoutProps(renderer as Parameters<typeof withJsonFormsLayoutProps>[0]),
  };
}
