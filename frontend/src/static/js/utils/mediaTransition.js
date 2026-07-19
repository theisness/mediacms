// 影视级播放转场（列表侧）：点击视频卡片 → 卡片封面 FLIP 放大铺满全屏，
// 同时并行拉取该片高清 poster 与整页跳转到 /view；落地页用 sessionStorage
// 交接的封面继续全屏遮罩（见 templates/cms/media.html 内联脚本），播放器就绪
// 即自动播放并把遮罩收进播放器，观感上没有白屏刷新。
//
// /view 在 PJAX 黑名单里（播放器必须整页初始化），因此这里不是取消刷新，
// 而是用「动画盖住刷新」：跳转发生在放大动画进行中，两端封面无缝衔接。

const STORAGE_KEY = 'lotusMediaTransition';
const ANIMATION_MS = 520;
const NAVIGATE_AT_MS = 420;

let transitioning = false;

function findMediaLink(ev) {
  const link = ev.target.closest('a');
  if (!link) return null;
  // 卡片链接是绝对 URL（https://host/view?m=xxx），按解析后的 pathname 判断。
  let url;
  try {
    url = new URL(link.getAttribute('href') || '', window.location.href);
  } catch (e) {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  if (url.pathname.replace(/\/$/, '') !== '/view' || !url.searchParams.get('m')) return null;
  return link;
}

function extractBackgroundUrl(el) {
  const bg = getComputedStyle(el).backgroundImage || '';
  const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
  return m ? m[1] : null;
}

// 返回 { el, url }：el 用于起始几何，url 是封面图地址。
// 卡片缩略图是 a.item-thumb 上的 background-image，而非 <img>。
function findPoster(link) {
  const candidates = [link];
  const item = link.closest('.item');
  if (item) {
    const thumb = item.querySelector('.item-thumb');
    if (thumb) candidates.unshift(thumb);
  }
  for (const el of candidates) {
    const url = extractBackgroundUrl(el);
    if (url) return { el, url };
  }
  const img = link.querySelector('img') || (item && item.querySelector('img'));
  if (img && (img.currentSrc || img.src)) return { el: img, url: img.currentSrc || img.src };
  return null;
}

function mediaToken(href) {
  const m = href.match(/[?&]m=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function buildOverlay(rect, posterUrl) {
  const backdrop = document.createElement('div');
  backdrop.className = 'lotus-media-transition-backdrop';
  const poster = document.createElement('div');
  poster.className = 'lotus-media-transition-poster';
  poster.style.top = rect.top + 'px';
  poster.style.left = rect.left + 'px';
  poster.style.width = rect.width + 'px';
  poster.style.height = rect.height + 'px';
  poster.style.backgroundImage = "url('" + posterUrl + "')";
  document.body.appendChild(backdrop);
  document.body.appendChild(poster);
  return { backdrop, poster };
}

function fetchHiResPoster(token, onFound) {
  if (!token) return;
  fetch('/api/v1/media/' + encodeURIComponent(token), {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const url = data && (data.poster_url || data.thumbnail_url);
      if (!url) return;
      const abs = new URL(url, window.location.origin).href;
      const img = new Image();
      img.onload = () => onFound(abs);
      img.src = abs;
    })
    .catch(() => {});
}

function startTransition(link, posterInfo) {
  transitioning = true;
  const href = new URL(link.getAttribute('href'), window.location.href).href;
  const posterUrl = posterInfo.url;
  const rect = posterInfo.el.getBoundingClientRect();
  const state = { poster: posterUrl, ts: Date.now() };

  const { poster } = buildOverlay(rect, posterUrl);

  // 并行抓高清 poster：加载完成即无缝换图（同一元素换 background，无闪烁），
  // 并写进交接状态供落地页沿用。
  fetchHiResPoster(mediaToken(href), (hiResUrl) => {
    state.poster = hiResUrl;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
    if (poster.isConnected) {
      poster.style.backgroundImage = "url('" + hiResUrl + "'), url('" + posterUrl + "')";
    }
  });

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* ignore */
  }

  // 双 rAF 确保初始几何先被绘制，再触发到全屏的过渡。
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('lotus-media-transition-active');
      poster.style.top = '0px';
      poster.style.left = '0px';
      poster.style.width = '100vw';
      poster.style.height = '100vh';
      poster.style.borderRadius = '0px';
    });
  });

  // 动画尚未完全结束就发起跳转：卸载与网络时间藏进最后 100ms + 落地页遮罩里。
  setTimeout(() => {
    window.location.assign(href);
  }, NAVIGATE_AT_MS);

  // 兜底：若跳转被极端阻塞，动画结束后仍保持全屏遮罩等待浏览器完成导航。
  setTimeout(() => {
    transitioning = false;
  }, ANIMATION_MS + 4000);
}

function onClick(ev) {
  if (transitioning) {
    ev.preventDefault();
    return;
  }
  if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return;
  const link = findMediaLink(ev);
  if (!link || link.target === '_blank') return;
  const posterInfo = findPoster(link);
  if (!posterInfo) return; // 没有封面可动画（纯文字链接），走原生跳转

  ev.preventDefault();
  ev.stopPropagation();
  startTransition(link, posterInfo);
}

export function initMediaTransition() {
  if (window.__lotusMediaTransitionInit) return;
  window.__lotusMediaTransitionInit = true;
  // capture 阶段注册，先于 PJAX 的 bubble 监听拿到事件。
  document.addEventListener('click', onClick, true);
}

if (typeof window !== 'undefined') {
  initMediaTransition();
}
