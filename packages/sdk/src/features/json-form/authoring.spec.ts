import * as JsonFormsReact from '@jsonforms/react';
import { describe, expect, it } from 'vitest';

import * as sdk from '../../index';

describe('the JsonForms authoring primitives', () => {
  it('reach consumers through the package index, the JsonForms component included', () => {
    expect(sdk.JsonForms).toBe(JsonFormsReact.JsonForms);
  });
});
