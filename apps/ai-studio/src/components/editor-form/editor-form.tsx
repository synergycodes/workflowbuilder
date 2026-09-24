import { JsonForms, useJsonForms } from '@workflowbuilder/sdk';
import type { JsonSchema } from '@workflowbuilder/sdk';
import { type ComponentProps, type Ref, useEffect, useImperativeHandle, useRef, useState } from 'react';

import styles from './editor-form.module.css';

import { editorLayout } from '../../utils/editor-form/editor-layout';
import { invalidFieldsOf } from '../../utils/editor-form/form-schema';
import { isPlainObject } from '../../utils/is-plain-object';
import { FormBoundary } from './form-boundary';

type Middleware = NonNullable<ComponentProps<typeof JsonForms>['middleware']>;

type ValidationMode = NonNullable<ComponentProps<typeof JsonForms>['validationMode']>;

type EditorFormSnapshot = { data: Record<string, unknown>; invalidFields: ReadonlySet<string> };

export type EditorFormHandle = { snapshot: () => EditorFormSnapshot };

type Props = {
  schema: JsonSchema;
  initialData: Record<string, unknown>;
  readOnly?: boolean;
  validate?: boolean;
  /** Receives the top-level fields the schema finds fault with, once JsonForms reports the change. */
  onInvalidFieldsChange?: (invalidFields: ReadonlySet<string>) => void;
  /** Called when the validator or a control throws: the form shows a notice in place of its fields. */
  onFail?: () => void;
  /** Receives the data the form holds as it unmounts, including a change the debounced report has not sent yet. */
  onUnmount?: (data: Record<string, unknown>) => void;
  ref?: Ref<EditorFormHandle>;
};

/**
 * A schema and its data rendered with the editor's own controls and validator, for data that is not a node's
 * properties. Mounted inside the properties form, whose renderers it borrows. Everything but `readOnly` and the
 * callbacks is read once, when the form mounts.
 */
export function EditorForm({
  schema,
  initialData,
  readOnly = false,
  validate = true,
  onInvalidFieldsChange,
  onFail,
  onUnmount,
  ref,
}: Props) {
  const { renderers, cells, core } = useJsonForms();
  // JsonForms resets to `data` when `data`, `schema`, `uischema` or `validationMode` changes, so all hold from mount.
  const [fixed] = useState(() => {
    const validationMode: ValidationMode = validate ? 'ValidateAndShow' : 'NoValidation';
    return { schema, data: initialData, layout: editorLayout(schema), validationMode };
  });
  // JsonForms reports changes debounced; the middleware sees each one as it happens.
  const latest = useRef<EditorFormSnapshot>({ data: initialData, invalidFields: new Set() });

  const track: Middleware = (state, action, reduce) => {
    const next = reduce(state, action);
    latest.current = {
      data: isPlainObject(next.data) ? next.data : {},
      invalidFields: invalidFieldsOf(next.errors),
    };
    return next;
  };

  useImperativeHandle(ref, () => ({ snapshot: () => latest.current }), []);

  const onUnmountRef = useRef(onUnmount);
  onUnmountRef.current = onUnmount;
  useEffect(() => () => onUnmountRef.current?.(latest.current.data), []);

  return (
    <div className={styles['fields']}>
      <FormBoundary fallback={<p role="alert">These fields cannot be shown here.</p>} onError={onFail}>
        <JsonForms
          schema={fixed.schema}
          uischema={fixed.layout}
          data={fixed.data}
          renderers={renderers ?? []}
          cells={cells}
          ajv={core?.ajv}
          readonly={readOnly}
          validationMode={fixed.validationMode}
          middleware={track}
          onChange={({ errors }) => onInvalidFieldsChange?.(invalidFieldsOf(errors))}
        />
      </FormBoundary>
    </div>
  );
}
