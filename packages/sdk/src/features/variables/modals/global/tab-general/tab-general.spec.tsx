import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderInRoot } from '../../../../ui-extensions/test-utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../../../hooks/use-translate-if-possible', () => ({
  useTranslateIfPossible: () => String,
}));

vi.mock('../../../../../hooks/use-theme', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('../../../../../hooks/use-workflow-builder-actions', () => ({
  useWorkflowBuilderActions: () => ({ setTheme: vi.fn() }),
}));

const { TabGeneral } = await import('./tab-general');

const themeSegments = () => screen.queryAllByRole('button', { name: /^header\.theme\./ });

describe('TabGeneral', () => {
  it('shows the theme toggle by default', () => {
    renderInRoot(<TabGeneral />);

    expect(themeSegments()).toHaveLength(2);
  });

  // A host that pins the theme hides the toggle; a second one here would do nothing.
  it('hides the theme toggle together with the app bar one', () => {
    renderInRoot(<TabGeneral />, { builtInControls: { themeToggle: false } });

    expect(themeSegments()).toHaveLength(0);
    expect(screen.getByText('workflowsSettings.tab.general')).toBeTruthy();
  });
});
