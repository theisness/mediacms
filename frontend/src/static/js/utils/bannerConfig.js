import { useEffect, useState } from 'react';

// 首页横幅配置（管理员在 Django admin 可换图 / 调取景）。
// 单次会话内只请求一次；请求失败或未配置时返回 null 字段，调用方回落内置图。

let cachedPromise = null;

const DEFAULTS = {
  banner_dark: null,
  banner_light: null,
  dark_position: null,
  light_position: null,
};

export function fetchBannerConfig() {
  if (!cachedPromise) {
    cachedPromise = fetch('/api/v1/home_banner', { headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : DEFAULTS))
      .catch(() => DEFAULTS);
  }
  return cachedPromise;
}

export function useBannerConfig() {
  const [config, setConfig] = useState(DEFAULTS);

  useEffect(() => {
    let alive = true;
    fetchBannerConfig().then((cfg) => {
      if (alive && cfg) {
        setConfig(cfg);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return config;
}
