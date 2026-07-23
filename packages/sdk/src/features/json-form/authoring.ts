// JsonForms authoring primitives, re-exposed under @workflowbuilder/sdk so
// custom-renderer authors import them from the SDK and share its single
// JsonForms copy (a HOC from the consumer's own copy would read a different
// React context and get empty props). Re-declared locally rather than via
// `export … from` so TypeDoc keeps the `@category` below instead of resolving
// it from the upstream @jsonforms declaration.
import * as JsonFormsCore from '@jsonforms/core';
import * as JsonFormsReact from '@jsonforms/react';

/**
 * Connects a component to a JsonForms control, injecting control props.
 * @category Forms
 */
export const withJsonFormsControlProps = JsonFormsReact.withJsonFormsControlProps;

/**
 * Connects a component to a JsonForms layout, injecting child uischema elements.
 * @category Forms
 */
export const withJsonFormsLayoutProps = JsonFormsReact.withJsonFormsLayoutProps;

/**
 * Connects a component to a JsonForms label element.
 * @category Forms
 */
export const withJsonFormsLabelProps = JsonFormsReact.withJsonFormsLabelProps;

/**
 * Connects a component to a JsonForms cell, for list/array cell rendering.
 * @category Forms
 */
export const withJsonFormsCellProps = JsonFormsReact.withJsonFormsCellProps;

/**
 * Reads the full JsonForms state from inside a renderer.
 * @category Forms
 */
export const useJsonForms = JsonFormsReact.useJsonForms;

/**
 * Renders a nested uischema subtree from a custom layout renderer.
 * @category Forms
 */
export const JsonFormsDispatch = JsonFormsReact.JsonFormsDispatch;

/**
 * Assigns a priority to a tester; rank above the built-ins to override a control.
 * @category Forms
 */
export const rankWith = JsonFormsCore.rankWith;

/**
 * Tester matching a uischema element by its `type`.
 * @category Forms
 */
export const uiTypeIs = JsonFormsCore.uiTypeIs;

/**
 * Tester matching any control element.
 * @category Forms
 */
export const isControl = JsonFormsCore.isControl;

/**
 * Tester matching any layout element.
 * @category Forms
 */
export const isLayout = JsonFormsCore.isLayout;

/**
 * Combines testers — matches when all match.
 * @category Forms
 */
export const and = JsonFormsCore.and;

/**
 * Combines testers — matches when any match.
 * @category Forms
 */
export const or = JsonFormsCore.or;

/**
 * Negates a tester.
 * @category Forms
 */
export const not = JsonFormsCore.not;

/**
 * Tester matching when the bound schema fragment satisfies a predicate.
 * @category Forms
 */
export const schemaMatches = JsonFormsCore.schemaMatches;

/**
 * Tester matching by the bound schema's `type`.
 * @category Forms
 */
export const schemaTypeIs = JsonFormsCore.schemaTypeIs;

/**
 * Tester matching when the control's `scope` ends with a fragment.
 * @category Forms
 */
export const scopeEndsWith = JsonFormsCore.scopeEndsWith;

/**
 * Tester matching by a uischema element `options` value.
 * @category Forms
 */
export const optionIs = JsonFormsCore.optionIs;

/**
 * Tester matching by the bound schema's `format`.
 * @category Forms
 */
export const formatIs = JsonFormsCore.formatIs;

/**
 * Rule effect for conditional uischema rules (`SHOW`, `HIDE`, `ENABLE`, `DISABLE`).
 * @category Forms
 */
export const RuleEffect = JsonFormsCore.RuleEffect;
export type RuleEffect = JsonFormsCore.RuleEffect;

/**
 * Props injected into a custom control renderer.
 * @category Forms
 */
export type ControlProps = JsonFormsCore.ControlProps;

/**
 * Props injected into a custom layout renderer.
 * @category Forms
 */
export type LayoutProps = JsonFormsCore.LayoutProps;

/**
 * Props injected into a custom label renderer.
 * @category Forms
 */
export type LabelProps = JsonFormsCore.LabelProps;

/**
 * Props injected into a custom cell renderer.
 * @category Forms
 */
export type CellProps = JsonFormsCore.CellProps;

/**
 * A tester paired with its rank, as returned by {@link rankWith}.
 * @category Forms
 */
export type RankedTester = JsonFormsCore.RankedTester;

/**
 * A renderer/cell matcher function.
 * @category Forms
 */
export type Tester = JsonFormsCore.Tester;

/**
 * A JSON Schema, as used for node property schemas.
 * @category Forms
 */
export type JsonSchema = JsonFormsCore.JsonSchema;

/**
 * A uischema control element.
 * @category Forms
 */
export type ControlElement = JsonFormsCore.ControlElement;

/**
 * A uischema layout element.
 * @category Forms
 */
export type Layout = JsonFormsCore.Layout;
