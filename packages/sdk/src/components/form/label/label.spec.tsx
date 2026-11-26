import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import '../../../features/i18n/index';
import { Label } from './label';

describe('Label', () => {
  it('shows a label that names a group of translations as written', () => {
    render(<Label label="validation" />);

    expect(screen.getByText('validation', { exact: true })).toBeDefined();
  });

  it('translates a label that names a text', () => {
    render(<Label label="common.settings" />);

    expect(screen.getByText('Settings', { exact: true })).toBeDefined();
  });
});
