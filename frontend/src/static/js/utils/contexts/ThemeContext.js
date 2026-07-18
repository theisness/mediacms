import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserCache } from '../classes/';
import { addClassname, removeClassname, supportsSvgAsImg } from '../helpers/';
import { config as mediacmsConfig } from '../settings/config.js';
import SiteContext from './SiteContext';

const config = mediacmsConfig(window.MediaCMS);

const THEMES = [
  { id: 'indigo', label: '深靛鎏金', swatch: '#12172A', metaColor: '#12172A' },
  { id: 'paper', label: '素雅宣纸', swatch: '#F7F4ED', metaColor: '#F7F4ED' },
  { id: 'crimson', label: '玄夜朱金', swatch: '#0D0D0D', metaColor: '#0D0D0D' },
];

const DEFAULT_THEME = 'indigo';
const THEME_CACHE_KEY = 'mode';

function initLogo(logo) {
  let light = null;
  let dark = null;

  if (void 0 !== logo.darkMode) {
    if (supportsSvgAsImg() && void 0 !== logo.darkMode.svg && '' !== logo.darkMode.svg) {
      dark = logo.darkMode.svg;
    } else if (void 0 !== logo.darkMode.img && '' !== logo.darkMode.img) {
      dark = logo.darkMode.img;
    }
  }

  if (void 0 !== logo.lightMode) {
    if (supportsSvgAsImg() && void 0 !== logo.lightMode.svg && '' !== logo.lightMode.svg) {
      light = logo.lightMode.svg;
    } else if (void 0 !== logo.lightMode.img && '' !== logo.lightMode.img) {
      light = logo.lightMode.img;
    }
  }

  if (null !== light || null !== dark) {
    if (null === light) {
      light = dark;
    } else if (null === dark) {
      dark = light;
    }
  }

  return {
    light,
    dark,
  };
}

function initMode(cachedValue) {
  return THEMES.some((t) => t.id === cachedValue) ? cachedValue : DEFAULT_THEME;
}

function applyTheme(mode) {
  const theme = THEMES.find((t) => t.id === mode) || THEMES[0];
  document.documentElement.setAttribute('data-theme', mode);

  // 兼容旧 body.dark_theme 逻辑：paper 与 indigo 视为 light，crimson 视为 dark
  if ('crimson' === mode) {
    addClassname(document.body, 'dark_theme');
  } else {
    removeClassname(document.body, 'dark_theme');
  }

  // 同步 meta theme-color（移动端地址栏颜色）
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', theme.metaColor);
}

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const site = useContext(SiteContext);
  const cache = new BrowserCache('MediaCMS[' + site.id + '][theme]', 86400);
  const [themeMode, setThemeMode] = useState(initMode(cache.get(THEME_CACHE_KEY)));
  const logos = initLogo(config.theme.logo);
  const isDarkLogo = 'paper' !== themeMode;
  const [logo, setLogo] = useState(logos[isDarkLogo ? 'dark' : 'light']);

  const setMode = (mode) => {
    if (THEMES.some((t) => t.id === mode)) {
      setThemeMode(mode);
    }
  };

  const nextMode = () => {
    const idx = THEMES.findIndex((t) => t.id === themeMode);
    const next = THEMES[(idx + 1) % THEMES.length];
    setMode(next.id);
  };

  useEffect(() => {
    applyTheme(themeMode);
    cache.set(THEME_CACHE_KEY, themeMode);
    const useDarkLogo = 'paper' !== themeMode;
    setLogo(logos[useDarkLogo ? 'dark' : 'light']);
  }, [themeMode]);

  const value = {
    logo,
    currentThemeMode: themeMode,
    themes: THEMES,
    setThemeMode: setMode,
    changeThemeMode: nextMode,
    themeModeSwitcher: config.theme.switch,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const ThemeConsumer = ThemeContext.Consumer;

// 在入口渲染前调用，防止首屏闪白/闪错主题
export function applyInitialTheme() {
  const siteId = window.MediaCMS && window.MediaCMS.site ? window.MediaCMS.site.id : 'mediacms-frontend';
  const cacheKey = 'MediaCMS[' + siteId + '][theme]';
  let cached = null;
  try {
    cached = localStorage.getItem(cacheKey);
    if (cached) cached = JSON.parse(cached).value;
  } catch (e) {
    cached = null;
  }
  const mode = initMode(cached);
  applyTheme(mode);
}
