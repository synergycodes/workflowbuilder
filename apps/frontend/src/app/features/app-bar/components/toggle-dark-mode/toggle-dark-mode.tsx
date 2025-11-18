import { IconSwitch } from '@synergycodes/overflow-ui';
import { MoonStars, Sun } from '@phosphor-icons/react';

import { useTheme } from '@/hooks/use-theme';

export function ToggleDarkMode() {
  const { theme, toggleTheme } = useTheme();

  return (
    <IconSwitch
      checked={theme === 'dark'}
      onChange={toggleTheme}
      icon={<Sun />}
      IconChecked={<MoonStars />}
      variant="secondary"
    />
  );
}
