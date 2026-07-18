import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider, applyInitialTheme } from './contexts/ThemeContext';
import { LayoutProvider } from './contexts/LayoutContext';
import { UserProvider } from './contexts/UserContext';
import './spaNav'; // 自动启用 PJAX 无刷新导航

// 在 React 首次渲染前应用主题，避免闪白/闪错主题
applyInitialTheme();

const AppProviders = ({ children }) => (
  <LayoutProvider>
    <ThemeProvider>
      <UserProvider>{children}</UserProvider>
    </ThemeProvider>
  </LayoutProvider>
);

import { PageHeader, PageSidebar } from '../components/page-layout';

const mountedRoots = {
  header: false,
  sidebar: false,
};

export function renderPage(idSelector, PageComponent) {
  const appHeader = document.getElementById('app-header');
  const appSidebar = document.getElementById('app-sidebar');
  const appContent = idSelector ? document.getElementById(idSelector) : undefined;

  // SPA 导航时，header/sidebar 已经挂载，只重新渲染内容区，避免闪烁
  if (appContent && PageComponent) {
    if (!mountedRoots.header && appHeader) {
      mountedRoots.header = true;
    }
    if (!mountedRoots.sidebar && appSidebar) {
      mountedRoots.sidebar = true;
    }

    ReactDOM.render(
      <AppProviders>
        {appHeader ? ReactDOM.createPortal(<PageHeader />, appHeader) : null}
        {appSidebar ? ReactDOM.createPortal(<PageSidebar />, appSidebar) : null}
        <PageComponent />
      </AppProviders>,
      appContent
    );
  } else if (appHeader && appSidebar) {
    ReactDOM.render(
      <AppProviders>
        {ReactDOM.createPortal(<PageHeader />, appHeader)}
        <PageSidebar />
      </AppProviders>,
      appSidebar
    );
    mountedRoots.header = true;
    mountedRoots.sidebar = true;
  } else if (appHeader) {
    ReactDOM.render(
      <LayoutProvider>
        <ThemeProvider>
          <UserProvider>
            <PageHeader />
          </UserProvider>
        </ThemeProvider>
      </LayoutProvider>,
      appSidebar
    );
    mountedRoots.header = true;
  } else if (appSidebar) {
    ReactDOM.render(
      <AppProviders>
        <PageSidebar />
      </AppProviders>,
      appSidebar
    );
    mountedRoots.sidebar = true;
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
  return mountedRoots.sidebar;
}

export function resetMountedRoots() {
  mountedRoots.header = false;
  mountedRoots.sidebar = false;
}
