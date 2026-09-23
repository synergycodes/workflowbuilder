import { JsonForms, useJsonForms } from '@workflowbuilder/sdk';
import type { JsonSchema } from '@workflowbuilder/sdk';
import { type ComponentProps, type Ref, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { isPlainObject } from '../../utils/is-plain-object';
import { editorLayout } from './editor-layout';
import { invalidFieldsOf } from './form-schema';

type Middleware = NonNullable<ComponentProps<typeof JsonForms>['middleware']>;

type EditorFormSnapshot = { data: Record<string, unknown>; invalidFields: ReadonlySet<string> };

export type EditorFormHandle = { snapshot: () => EditorFormSnapshot };

type Props = {
  schema: JsonSchema;
  initialData: Record<string, unknown>;
  readOnly?: boolean;
  /** Fixed for the life of the form: a change of validation mode resets it, like a new `data`. */
  validate?: boolean;
  /** Receives the top-level fields the schema finds fault with, once JsonForms reports the change. */
  onInvalidFieldsChange?: (invalidFields: ReadonlySet<string>) => void;
  /** Receives the data the form holds as it unmounts, including a change the debounced report has not sent yet. */
  onUnmount?: (data: Record<string, unknown>) => void;
  ref?: Ref<EditorFormHandle>;
};

/**
 * A schema and its data rendered with the editor's own controls and validator, for data that is not a node's
 * properties. Mounted inside the properties form, whose renderers it borrows.
 */
export function EditorForm({
  schema,
  initialData,
  readOnly = false,
  validate = true,
  onInvalidFieldsChange,
  onUnmount,
  ref,
}: Props) {
  const { renderers, cells, core } = useJsonForms();
  // A new `data`, `schema` or `uischema` object resets JsonForms to that data, so each holds for the life of the form.
  const [startingData] = useState(initialData);
  const layout = useMemo(() => editorLayout(schema), [schema]);
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
    <JsonForms
      schema={schema}
      uischema={layout}
      data={startingData}
      renderers={renderers ?? []}
      cells={cells}
      ajv={core?.ajv}
      readonly={readOnly}
      validationMode={validate ? 'ValidateAndShow' : 'NoValidation'}
      middleware={track}
      onChange={({ errors }) => onInvalidFieldsChange?.(invalidFieldsOf(errors))}
    />
  );
}
