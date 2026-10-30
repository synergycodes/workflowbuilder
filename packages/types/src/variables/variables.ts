/**
 * A variable reference string, as stored in node properties: `{{<scope>.<path>}}`.
 * Node outputs use the `nodes` scope (`{{nodes.<nodeId>.<property>}}`).
 *
 * @category Types
 */
export type VariableReference =
  | `{{global.${string}}}`
  | `{{trigger.${string}}}`
  | `{{nodes.${string}}}`
  | `{{variables.${string}}}`;

/**
 * Scalar variable types. `date` and `datetime` are strings that the editor treats as dates.
 *
 * @category Types
 */
export type VariableTypePrimitive = 'string' | 'number' | 'boolean' | 'datetime' | 'date';

/**
 * Every type a variable can have: a {@link VariableTypePrimitive} or a nested `object` / `array`.
 *
 * @category Types
 */
export type VariableType = VariableTypePrimitive | 'object' | 'array';
