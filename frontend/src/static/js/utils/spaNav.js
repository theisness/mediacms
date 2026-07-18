// 轻量 PJAX：拦截同域内部链接，只替换主内容区 .page-main-wrap，
// 保留 #app-header / #app-sidebar / #app-footer 的 React 树，避免整页白闪。
// 黑名单页面（含复杂播放器 / 表单的页面）回退原生整页刷新。

import ReactDOM from 'react-dom';

const BLACKLIST = [
  /^\/v\//, // 媒体详情页 /v/{token}
  /^\/w\//, // 备用媒体详情页 /w/{token}
  /^\/embed/, // 嵌入页
  /^\/add-media/, // 上传页
  /^\/edit-media/, // 编辑页
  /^\/edit-channel/, // 编辑频道
  /^\/edit-profile/, // 编辑资料
  /^\/signin/, // 登录
  /^\/signout/, // 登出
  /^\/register/, // 注册
  /^\/reset-password/, // 重置密码
];

let isNavigating = false;

function isBlacklisted(url) {
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  return BLACKLIST.some((re) => re.test(pathname));
}

function isSameOrigin(url) {
  return url.origin === window.location.origin;
}

function createTransitionOverlay() {
  let overlay = document.getElementById('lotus-pjax-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'lotus-pjax-overlay';
    overlay.innerHTML = '<div class="lotus-pjax-spinner"></div>';
    document.body.appendChild(overlay);
  }
  return overlay;
}

function showTransition() {
  const overlay = createTransitionOverlay();
  overlay.classList.add('active');
}

function hideTransition() {
  const overlay = document.getElementById('lotus-pjax-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

function absoluteUrl(href) {
  try {
    return new URL(href, window.location.href).href;
  } catch (e) {
    return href;
  }
}

function isAssetLoaded(tag, url) {
  const abs = absoluteUrl(url);
  const selector = tag === 'script' ? 'script[src]' : 'link[rel="stylesheet"]';
  return Array.from(document.querySelectorAll(selector)).some((el) => {
    const src = tag === 'script' ? el.getAttribute('src') : el.getAttribute('href');
    return absoluteUrl(src) === abs;
  });
}

function loadScript(src) {
  return new Promise((resolve) => {
    if (isAssetLoaded('script', src)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => {
      console.warn('[PJAX] Failed to load script:', src);
      // 单条脚本失败不阻断后续
      resolve();
    };
    document.head.appendChild(script);
  });
}

// 始终重新执行某脚本（用于页面入口脚本，即使它之前已加载）
function executeScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => {
      console.warn('[PJAX] Failed to execute script:', src);
      resolve();
    };
    document.head.appendChild(script);
  });
}

function loadScriptsInOrder(sources) {
  return sources
    .filter((src) => Boolean(src))
    .reduce((promise, src) => promise.then(() => loadScript(src)), Promise.resolve());
}

function loadStylesheet(href) {
  return new Promise((resolve) => {
    if (isAssetLoaded('link', href)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = () => {
      console.warn('[PJAX] Failed to load stylesheet:', href);
      resolve();
    };
    document.head.appendChild(link);
  });
}

function updateStylesheets(newDoc) {
  const newLinks = Array.from(newDoc.querySelectorAll('head link[rel="stylesheet"]'));
  const newHrefs = new Set(newLinks.map((l) => absoluteUrl(l.getAttribute('href'))).filter(Boolean));

  // 移除当前 head 中不存在于新页面的样式（保留公共 chunk 如 _commons.css / 2822.css 等）
  Array.from(document.querySelectorAll('head link[rel="stylesheet"]')).forEach((link) => {
    const href = absoluteUrl(link.getAttribute('href'));
    if (href && !newHrefs.has(href)) {
      link.remove();
    }
  });

  // 按顺序补充新页面新增样式
  return newLinks.reduce(
    (promise, link) => promise.then(() => loadStylesheet(link.getAttribute('href'))),
    Promise.resolve()
  );
}

function updateMeta(newDoc) {
  if (newDoc.title) {
    document.title = newDoc.title;
  }

  const newThemeColor = newDoc.querySelector('meta[name="theme-color"]');
  const currentThemeColor = document.querySelector('meta[name="theme-color"]');
  if (newThemeColor && currentThemeColor) {
    currentThemeColor.setAttribute('content', newThemeColor.getAttribute('content'));
  }
}

function evalMediaCmsConfig(newDoc) {
  const mediaCmsScript = Array.from(newDoc.querySelectorAll('script')).find((s) =>
    s.textContent.includes("window['MediaCMS']")
  );
  if (mediaCmsScript) {
    try {
      // eslint-disable-next-line no-eval
      eval(mediaCmsScript.textContent);
    } catch (e) {
      console.warn('[PJAX] Failed to eval MediaCMS config:', e);
    }
  }
}

function unmountCurrentPage() {
  const currentMain = document.querySelector('.page-main-wrap');
  if (!currentMain) return;
  const pageRoot = currentMain.querySelector('[id^="page-"]');
  if (pageRoot) {
    try {
      ReactDOM.unmountComponentAtNode(pageRoot);
    } catch (e) {
      console.warn('[PJAX] Failed to unmount current page:', e);
    }
  }
}

function swapPageContent(newDoc) {
  const currentMain = document.querySelector('.page-main-wrap');
  const newMain = newDoc.querySelector('.page-main-wrap');
  if (currentMain && newMain) {
    unmountCurrentPage();
    currentMain.innerHTML = newMain.innerHTML;
  }
}

function updateActiveSidebar(pathname) {
  // 侧边栏 active 态同步
  setTimeout(() => {
    const sidebarLinks = document.querySelectorAll('.page-sidebar a, .page-sidebar button');
    sidebarLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      try {
        const linkUrl = new URL(href, window.location.origin);
        const active = linkUrl.pathname === pathname;
        const li = link.closest('li');
        if (li) {
          if (active) {
            li.classList.add('active');
          } else {
            li.classList.remove('active');
          }
        }
      } catch (e) {
        // ignore
      }
    });
  }, 0);
}

function restoreTheme() {
  const savedTheme = localStorage.getItem(
    'MediaCMS[' + (window.MediaCMS?.site?.id || 'mediacms-frontend') + '][theme]'
  );
  if (savedTheme) {
    try {
      const mode = JSON.parse(savedTheme).value;
      if (mode) document.documentElement.setAttribute('data-theme', mode);
    } catch (e) {
      // ignore
    }
  }
}

export function navigate(url, pushState = true) {
  if (isNavigating) return;
  isNavigating = true;

  const targetUrl = url instanceof URL ? url : new URL(url, window.location.href);

  if (!isSameOrigin(targetUrl) || isBlacklisted(targetUrl)) {
    isNavigating = false;
    window.location.assign(targetUrl.href);
    return;
  }

  showTransition();

  fetch(targetUrl.href, {
    method: 'GET',
    headers: { 'X-Lotus-PJAX': '1' },
    credentials: 'same-origin',
  })
    .then((res) => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.text();
    })
    .then((html) => {
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(html, 'text/html');

      // 提取新 head 中的脚本（按原始顺序，过滤掉已加载的）
      const headScripts = Array.from(newDoc.querySelectorAll('head script[src]'))
        .map((s) => s.getAttribute('src'))
        .filter(Boolean);

      updateMeta(newDoc);

      // 先同步配置，再加载脚本；页面入口会依赖 window.MediaCMS
      evalMediaCmsConfig(newDoc);

      // 更新样式：保留公共 chunk、移除旧页面专属、新增新页面专属
      return updateStylesheets(newDoc).then(() => {
        swapPageContent(newDoc);

        // 公共 chunk 只加载一次；页面入口脚本始终重新执行，
        // 这样返回已访问过的页面时内容区仍会重新渲染，且不会重复执行入口。
        const entrySrc = headScripts[headScripts.length - 1];
        const sharedScripts = entrySrc ? headScripts.slice(0, -1) : headScripts;
        return loadScriptsInOrder(sharedScripts)
          .then(() => (entrySrc ? executeScript(entrySrc) : Promise.resolve()))
          .then(() => {
          if (pushState) {
            window.history.pushState({ lotusPjax: true, url: targetUrl.href }, '', targetUrl.href);
          }

          restoreTheme();
          updateActiveSidebar(targetUrl.pathname);

          if (targetUrl.hash) {
            const el = document.querySelector(targetUrl.hash);
            if (el) el.scrollIntoView();
          } else {
            window.scrollTo(0, 0);
          }

          hideTransition();
          isNavigating = false;
          });
      });
    })
    .catch((err) => {
      console.warn('[PJAX] Navigation failed, falling back to full load:', err);
      hideTransition();
      isNavigating = false;
      window.location.assign(targetUrl.href);
    });
}

function onLinkClick(ev) {
  const link = ev.target.closest('a');
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

  // 允许 target="_blank" 与中键/ctrl/cmd+click 走原生
  if (link.target === '_blank' || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return;

  let url;
  try {
    url = new URL(href, window.location.href);
  } catch (e) {
    return;
  }

  if (!isSameOrigin(url)) return;
  if (isBlacklisted(url)) return;

  ev.preventDefault();
  navigate(url);
}

function onPopState(ev) {
  if (ev.state && ev.state.lotusPjax && ev.state.url) {
    navigate(ev.state.url, false);
  }
}

export function initSpaNav() {
  if (window.__lotusPjaxInit) return;
  window.__lotusPjaxInit = true;

  document.addEventListener('click', onLinkClick);
  window.addEventListener('popstate', onPopState);
}

// 页面初始化后自动挂载
if (typeof window !== 'undefined') {
  initSpaNav();
}
