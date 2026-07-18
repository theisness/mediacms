import React from 'react';
import { useTheme } from '../../../utils/hooks/';

export const SidebarThemeSwitcher = () => {
  const { currentThemeMode, themes, setThemeMode, themeModeSwitcher } = useTheme();

  return (
    themeModeSwitcher.enabled &&
    'sidebar' === themeModeSwitcher.position && (
      <div className="sidebar-theme-switcher">
        <div className="sidebar-theme-switcher-inner">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={'theme-option' + (theme.id === currentThemeMode ? ' active' : '')}
              title={theme.label}
              onClick={() => setThemeMode(theme.id)}
              aria-label={`切换主题：${theme.label}`}
            >
              <span className="theme-swatch" style={{ backgroundColor: theme.swatch }}></span>
              <span className="theme-label">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  );
};
