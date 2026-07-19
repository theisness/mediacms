import React from 'react';
import ReactDOM from 'react-dom';
import { installTranslations } from './translations/zh-CN';
import { ThemeProvider, applyInitialTheme } from './contexts/ThemeContext';
import { LayoutProvider } from './contexts/LayoutContext';
import { UserProvider } from './contexts/UserContext';
import './spaNav'; // 自动启用 PJAX 无刷新导航
import './mediaTransition'; // 视频卡片 → 全屏封面播放转场

// 先安装中文默认文案，再渲染，避免英文闪现
installTranslations();

// 在 React 首次渲染前应用主题，避免闪白/闪错主题
applyInitialTheme();

const AppProviders = ({ children }) => (
  <LayoutProvider>
    <ThemeProvider>
      <UserProvider>{children}</UserProvider>
    </ThemeProvider>
  </LayoutProvider>
);

import { PageHeader } from '../components/page-layout';

const mountedRoots = {
  header: false,
};

function renderHeader(appHeader) {
  if (!appHeader) return;
  const hasMountedDom = appHeader.dataset.lotusHeaderMounted === 'true' && appHeader.childNodes.length > 0;
  if ((mountedRoots.header && appHeader.childNodes.length > 0) || hasMountedDom) return;

  ReactDOM.render(
    <AppProviders>
      <PageHeader />
    </AppProviders>,
    appHeader
  );

  mountedRoots.header = true;
  appHeader.dataset.lotusHeaderMounted = 'true';
}

export function renderPage(idSelector, PageComponent) {
  const appHeader = document.getElementById('app-header');
  const appContent = idSelector ? document.getElementById(idSelector) : undefined;

  // Header 拥有独立且唯一的 React 根。PJAX 只替换页面内容，静态上传页也不再借侧栏当挂载宿主。
  renderHeader(appHeader);

  if (appContent && PageComponent) {
    ReactDOM.render(
      <AppProviders>
        <PageComponent />
      </AppProviders>,
      appContent
    );
  }
}

export function renderEmbedPage(idSelector, PageComponent) {
  const appContent = idSelector ? document.getElementById(idSelector) : undefined;

  if (appContent && PageComponent) {
    ReactDOM.render(<PageComponent />, appContent);
  }
}

export function isHeaderMounted() {
  return mountedRoots.header;
}

export function isSidebarMounted() {
  return false;
}

export function resetMountedRoots() {
  mountedRoots.header = false;
  const appHeader = document.getElementById('app-header');
  if (appHeader) delete appHeader.dataset.lotusHeaderMounted;
}
