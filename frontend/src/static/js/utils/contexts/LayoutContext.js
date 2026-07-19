import React, { createContext, useEffect, useState } from 'react';
import { removeClassname } from '../helpers/';

export const LayoutContext = createContext();

export const LayoutProvider = ({ children }) => {
  const [visibleMobileSearch, setVisibleMobileSearch] = useState(false);

  const toggleMobileSearch = () => {
    setVisibleMobileSearch(!visibleMobileSearch);
  };

  useEffect(() => {
    // 清理旧版本可能遗留的侧栏状态类；保留兼容字段给列表组件，但永远为 false。
    removeClassname(document.body, 'visible-sidebar');
    removeClassname(document.body, 'sliding-sidebar');
    removeClassname(document.body, 'overflow-hidden');
  }, []);

  const value = {
    enabledSidebar: false,
    visibleSidebar: false,
    setVisibleSidebar: () => {},
    visibleMobileSearch,
    toggleMobileSearch,
    toggleSidebar: () => {},
  };

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

export const LayoutConsumer = LayoutContext.Consumer;
