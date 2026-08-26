import type { BaseControlConfig } from '../../../types/controls';

type Params = {
  enabled?: boolean;
  config?: BaseControlConfig;
  uischema: { disabled?: boolean };
};

/**
 * Determines whether a control should be editable based on its configuration
 * and UI schema state.
 *
 * The control is considered non-editable when:
 * - `enabled` is explicitly set to `false`.
 * - `config.readonly` is explicitly set to `true`.
 * - `uischema.disabled` is explicitly set to `false`.
 *
 * @param controlProps - Configuration and UI schema state of the control.
 * @returns `true` when the control is editable; otherwise, `false`.
 */
export function useIsControlEditable(controlProps: Params): boolean {
  // Default value usually matching JSONForm readonly
  if (controlProps.enabled === false) {
    return false;
  }

  // uischema "rule" can override default readonly state of the control
  if (controlProps.config?.readonly === true) {
    return false;
  }

  // Optional flag on control
  if (controlProps.uischema.disabled === false) {
    return false;
  }

  return true;
}
