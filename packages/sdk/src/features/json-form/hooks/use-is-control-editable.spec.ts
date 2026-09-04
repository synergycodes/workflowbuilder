import { describe, expect, it } from 'vitest';

import { useIsControlEditable } from './use-is-control-editable';

describe('useIsControlEditable', () => {
  describe('enabled', () => {
    it('should be editable when enabled is true', () => {
      expect(useIsControlEditable({ enabled: true, uischema: {} })).toBe(true);
    });

    it('should not be editable when enabled is false', () => {
      expect(useIsControlEditable({ enabled: false, uischema: {} })).toBe(false);
    });

    it('should be editable when enabled is absent', () => {
      expect(useIsControlEditable({ uischema: {} })).toBe(true);
    });
  });

  describe('config.readonly', () => {
    it('should not be editable when config.readonly is true', () => {
      expect(useIsControlEditable({ config: { readonly: true }, uischema: {} })).toBe(false);
    });

    it('should be editable when config.readonly is false', () => {
      expect(useIsControlEditable({ config: { readonly: false }, uischema: {} })).toBe(true);
    });

    it('should be editable when config has no readonly flag', () => {
      expect(useIsControlEditable({ config: {}, uischema: {} })).toBe(true);
    });
  });

  describe('uischema.disabled', () => {
    it('should not be editable when uischema.disabled is true', () => {
      expect(useIsControlEditable({ uischema: { disabled: true } })).toBe(false);
    });

    it('should be editable when uischema.disabled is false', () => {
      expect(useIsControlEditable({ uischema: { disabled: false } })).toBe(true);
    });

    it('should not be editable when uischema.disabled is true even if a rule enabled the control', () => {
      expect(useIsControlEditable({ enabled: true, uischema: { disabled: true } })).toBe(false);
    });

    it('should not be editable when readonly is true even if uischema.disabled is false', () => {
      expect(useIsControlEditable({ config: { readonly: true }, uischema: { disabled: false } })).toBe(false);
    });
  });

  // A uischema `rule` with an ENABLE effect makes JsonForms pass
  // `enabled: true` to the control. `config.readonly` (the form-wide
  // readonly mode) must win over that local rule.
  describe('readonly mode vs a local enable rule', () => {
    it('should not be editable when readonly is true and a rule enabled the control', () => {
      expect(useIsControlEditable({ enabled: true, config: { readonly: true }, uischema: {} })).toBe(false);
    });

    it('should be editable when readonly is false and a rule enabled the control', () => {
      expect(useIsControlEditable({ enabled: true, config: { readonly: false }, uischema: {} })).toBe(true);
    });

    it('should be editable when readonly is absent and a rule enabled the control', () => {
      expect(useIsControlEditable({ enabled: true, config: {}, uischema: {} })).toBe(true);
    });

    it('should not be editable when readonly is true and no rule enabled the control', () => {
      expect(useIsControlEditable({ enabled: false, config: { readonly: true }, uischema: {} })).toBe(false);
    });

    it('should not be editable when readonly is false and a rule disabled the control', () => {
      expect(useIsControlEditable({ enabled: false, config: { readonly: false }, uischema: {} })).toBe(false);
    });
  });

  it('should be editable when everything is explicitly permissive', () => {
    expect(
      useIsControlEditable({
        enabled: true,
        config: { readonly: false },
        uischema: { disabled: false },
      }),
    ).toBe(true);
  });
});
