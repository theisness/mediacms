// 轻量 PJAX：拦截同域内部链接，只替换主内容区 .page-main-wrap，
// 保留独立的 #app-header 与静态 #app-footer，避免整页白闪。
// 黑名单页面（含复杂播放器 / 表单的页面）回退原生整页刷新。

import ReactDOM from 'react-dom';

const BLACKLIST = [
  /^\/view/, // 媒体详情页 /view?m={token}（本站实际使用的详情页路径，播放器复杂必须整页刷新）
  /^\/v\//, // 媒体详情页 /v/{token}（上游新版路径，保留兜底）
  /^\/w\//, // 备用媒体详情页 /w/{token}
  /^\/embed/, // 嵌入页
  /^\/manage\//, // 管理页（服务端渲染，非 SPA）
  /^\/admin\//, // Django 后台（服务端渲染，非 SPA）
  /^\/add-media/, // 兼容旧上传页路径
  /^\/upload/, // 生产上传页
  /^\/scpublisher/, // 上传页兼容入口
  /^\/edit-media/, // 编辑页
  /^\/edit-channel/, // 编辑频道
  /^\/edit-profile/, // 编辑资料
  /^\/signin/, // 登录
  /^\/signout/, // 登出
  /^\/register/, // 注册
  /^\/reset-password/, // 重置密码
  /^\/accounts\//, // allauth 登录/注册/登出流程必须整页刷新，重建用户与主题上下文
];

let isNavigating = false;
// 导航进行中又来了新请求（典型：连续快速点后退，两个 popstate 连发）时，
// 不能直接丢弃——地址栏已被浏览器改掉，丢弃会造成 URL 与内容错位；排队到当前导航结束后执行。
let pendingNav = null;

function finishNavigation() {
  isNavigating = false;
  if (pendingNav) {
    const next = pendingNav;
    pendingNav = null;
    navigate(next.url, next.pushState);
  }
}

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
  // 配置脚本实际形如 `var MediaCMS = {...}; ...; window.MediaCMS = MediaCMS;`，
  // 原先按 window['MediaCMS'] 匹配永远落空，导致 PJAX 后配置不更新。
  const mediaCmsScript = Array.from(newDoc.querySelectorAll('script')).find((s) =>
    s.textContent.includes('window.MediaCMS = MediaCMS')
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

function updateActiveNavigation(pathname) {
  // PJAX 保留 header，因此手动同步一级频道 active 态。
  setTimeout(() => {
    const navigationLinks = document.querySelectorAll('.header-primary-nav a');
    navigationLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      try {
        const linkUrl = new URL(href, window.location.origin);
        const active = linkUrl.pathname === pathname;
        link.classList.toggle('active', active);
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
  if (isNavigating) {
    pendingNav = { url, pushState };
    return;
  }
  isNavigating = true;

  const targetUrl = url instanceof URL ? url : new URL(url, window.location.href);

  const currentUrl = new URL(window.location.href);
  if (!isSameOrigin(targetUrl) || isBlacklisted(targetUrl) || isBlacklisted(currentUrl)) {
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

      // 页面入口脚本位于 body 的 bottomimports，不在 head；按原始顺序收集全部外链脚本。
      // 公共脚本由 loadScript 去重，最后一个页面脚本始终重新执行。
      const pageScripts = Array.from(newDoc.querySelectorAll('script[src]'))
        .map((s) => s.getAttribute('src'))
        .filter(Boolean);

      updateMeta(newDoc);

      // 必须先更新地址栏再执行页面入口脚本：搜索页等入口在初始化时读取
      // window.location 的查询参数，若 pushState 靠后，入口会拿到上一页的 URL。
      if (pushState) {
        window.history.pushState({ lotusPjax: true, url: targetUrl.href }, '', targetUrl.href);
      }

      // 先同步配置，再加载脚本；页面入口会依赖 window.MediaCMS
      evalMediaCmsConfig(newDoc);

      // 更新样式：保留公共 chunk、移除旧页面专属、新增新页面专属
      return updateStylesheets(newDoc).then(() => {
        swapPageContent(newDoc);

        // 公共 chunk 只加载一次；页面入口脚本始终重新执行，
        // 这样返回已访问过的页面时内容区仍会重新渲染，且不会重复执行入口。
        const entrySrc = pageScripts[pageScripts.length - 1];
        const sharedScripts = entrySrc ? pageScripts.slice(0, -1) : pageScripts;
        return loadScriptsInOrder(sharedScripts)
          .then(() => (entrySrc ? executeScript(entrySrc) : Promise.resolve()))
          .then(() => {
          restoreTheme();
          updateActiveNavigation(targetUrl.pathname);

          if (targetUrl.hash) {
            const el = document.querySelector(targetUrl.hash);
            if (el) el.scrollIntoView();
          } else {
            window.scrollTo(0, 0);
          }

          // 先完成滚动位置复位，再通知 header，避免新页面在顶部短暂沿用旧页面的毛玻璃状态。
          window.dispatchEvent(new CustomEvent('lotus:navigation-complete', { detail: { url: targetUrl.href } }));

          hideTransition();
          finishNavigation();
          });
      });
    })
    .catch((err) => {
      console.warn('[PJAX] Navigation failed, falling back to full load:', err);
      hideTransition();
      isNavigating = false;
      pendingNav = null;
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
  if (isBlacklisted(url) || isBlacklisted(new URL(window.location.href))) return;

  ev.preventDefault();
  navigate(url);
}

function onPopState(ev) {
  if (ev.state && ev.state.lotusPjax && ev.state.url) {
    navigate(ev.state.url, false);
    return;
  }
  // 整页加载产生的初始 history 条目没有 lotusPjax state；后退回到它时
  // 浏览器只改地址栏不动内容，必须兜底导航，否则 URL 与页面错位。
  navigate(window.location.href, false);
}

export function initSpaNav() {
  if (window.__lotusPjaxInit) return;
  window.__lotusPjaxInit = true;

  // 给当前（整页加载的）history 条目补上 PJAX 标记，让后退能正确还原内容。
  try {
    window.history.replaceState({ lotusPjax: true, url: window.location.href }, '', window.location.href);
  } catch (e) {
    /* ignore */
  }

  document.addEventListener('click', onLinkClick);
  window.addEventListener('popstate', onPopState);
}

// 页面初始化后自动挂载
if (typeof window !== 'undefined') {
  initSpaNav();
}
