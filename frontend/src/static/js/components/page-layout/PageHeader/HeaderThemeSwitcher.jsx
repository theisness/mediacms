import React from 'react';
import { useTheme } from '../../../utils/hooks/';

import './ThemeSwitchOption.scss';

export function HeaderThemeSwitcher() {
  const { currentThemeMode, themes, setThemeMode } = useTheme();

  return (
    <div className="theme-switch theme-options" aria-label="切换主题">
      {themes.map((theme) => (
        <button
          key={theme.id}
          type="button"
          className={'theme-option' + (theme.id === currentThemeMode ? ' active' : '')}
          onClick={() => setThemeMode(theme.id)}
          aria-pressed={theme.id === currentThemeMode}
        >
          <span className="theme-swatch" style={{ backgroundColor: theme.swatch }} />
          <span>{theme.label}</span>
        </button>
      ))}
    </div>
  );
}
