import React, { useEffect, useRef, useState } from 'react';
import { format } from 'timeago.js';
import { useUser } from '../../utils/hooks/';
import { PageStore } from '../../utils/stores/';
import { ApiUrlConsumer } from '../../utils/contexts/';
import { getRequest } from '../../utils/helpers/';
import { CircleIconButton, MaterialIcon, PopupMain, PopupTop } from '../_shared';
import { BrowserCache } from '../../utils/classes/';

import './MessageBox.scss';

const CACHE_TTL_SECONDS = 60;
const TAB_RECENT = 'recent';
const TAB_FEATURED = 'featured';
const PAGE_SIZE = 20;

function truncate(str, len = 42) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

// 已读水位：localStorage 持久化（无 TTL），按站点 + 用户区分。
// 红点只在「存在 add_date 晚于水位的评论」时亮；打开一次盒子即把水位推到最新。
function seenStorageKey(siteId, username) {
  return 'MediaCMS[' + siteId + '][messageBoxSeen][' + (username || 'unknown') + ']';
}

function commentTs(item) {
  const t = new Date(item && item.add_date).getTime();
  return isNaN(t) ? 0 : t;
}

function latestTs(items) {
  let ts = 0;
  (items || []).forEach((item) => {
    const t = commentTs(item);
    if (t > ts) ts = t;
  });
  return ts;
}

function MessageList({ items, emptyText }) {
  if (!items || !items.length) {
    return <div className="message-box-empty">{emptyText}</div>;
  }

  return (
    <ul className="message-list">
      {items.map((item) => {
        // API 返回的 media_url 形如 /view?m={token}，必须原样带上 query，拼上评论锚点即可。
        const commentAnchor = item.uid ? `#comment-${item.uid}` : '';
        return (
          <li key={item.uid} className="message-item">
            <a href={`${item.media_url || ''}${commentAnchor}`} className="message-link">
              <img
                className="message-thumb"
                src={item.author_thumbnail_url || '/static/images/lotus-brand/favicon-lotus.png'}
                alt={item.author_name}
              />
              <div className="message-body">
                <div className="message-top">
                  <span className="message-author">{item.author_name || item.username}</span>
                  <time className="message-time">{format(item.add_date)}</time>
                </div>
                <p className="message-text">{truncate(item.text)}</p>
                <p className="message-media">{truncate(item.media_title || '影片评论', 28)}</p>
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function MessageBox() {
  const { isAnonymous, username } = useUser();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(TAB_RECENT);
  const [recent, setRecent] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const cacheRef = useRef(null);
  const seenKeyRef = useRef(null);

  useEffect(() => {
    const siteId = PageStore.get('config-site').id || 'mediacms-frontend';
    cacheRef.current = new BrowserCache('MediaCMS[' + siteId + '][messageBox]', CACHE_TTL_SECONDS);
    seenKeyRef.current = seenStorageKey(siteId, username);
  }, [username]);

  const getSeen = () => {
    if (!seenKeyRef.current) return 0;
    try {
      return parseInt(localStorage.getItem(seenKeyRef.current), 10) || 0;
    } catch (e) {
      return 0;
    }
  };

  // 打开盒子即视为已读：水位推到当前最新评论时间，红点熄灭。
  const markSeen = (items) => {
    const ts = latestTs(items) || new Date().getTime();
    if (seenKeyRef.current) {
      try {
        localStorage.setItem(seenKeyRef.current, String(ts));
      } catch (e) {
        /* localStorage 不可用时静默降级：仅本次会话内熄灭 */
      }
    }
    setUnreadCount(0);
  };

  const loadTab = (tab, onLoaded) => {
    const cached = cacheRef.current.get(tab);
    if (cached && Array.isArray(cached)) {
      onLoaded(cached);
      return;
    }

    const apiUrl = PageStore.get('config-api') || {};
    const commentsUrl = apiUrl.comments;
    if (!commentsUrl) {
      onLoaded(null);
      return;
    }

    const url =
      tab === TAB_FEATURED
        ? `${commentsUrl}?is_featured=true&page_size=${PAGE_SIZE}`
        : `${commentsUrl}?ordering=-add_date&page_size=${PAGE_SIZE}`;

    getRequest(
      url,
      true,
      (res) => {
        const results = res && res.data && res.data.results ? res.data.results : [];
        cacheRef.current.set(tab, results);
        onLoaded(results);
      },
      () => onLoaded(null) // 失败回 null：不清已读水位，避免红点被误灭
    );
  };

  // 进页面就拉一次最新评论，跟已读水位比对：有新评论自动亮红点，无需点开。
  useEffect(() => {
    if (isAnonymous || !cacheRef.current) return;
    loadTab(TAB_RECENT, (results) => {
      if (!results) return;
      const visible = results.slice(0, PAGE_SIZE);
      setRecent(visible);
      const seen = getSeen();
      setUnreadCount(visible.filter((item) => commentTs(item) > seen).length);
    });
  }, [isAnonymous, username]);

  useEffect(() => {
    if (isAnonymous || !open || !cacheRef.current) return;

    setLoading(true);
    loadTab(activeTab, (results) => {
      setLoading(false);
      if (!results) return;
      const visibleResults = results.slice(0, PAGE_SIZE);
      if (activeTab === TAB_FEATURED) {
        setFeatured(visibleResults);
      } else {
        setRecent(visibleResults);
        markSeen(visibleResults);
      }
    });
  }, [isAnonymous, open, activeTab]);

  useEffect(() => {
    function onDocClick(ev) {
      if (boxRef.current && !boxRef.current.contains(ev.target)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('click', onDocClick);
    }
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  if (isAnonymous) {
    return null;
  }

  return (
    <ApiUrlConsumer>
      {() => (
        <div className="message-box" ref={boxRef}>
          <CircleIconButton
            className="message-box-trigger"
            onClick={() => setOpen((v) => !v)}
            aria-label="消息盒子"
            aria-expanded={open}
          >
            <MaterialIcon type="notifications" />
            {unreadCount > 0 && <span className="message-box-badge">{Math.min(unreadCount, 99)}</span>}
          </CircleIconButton>

          {open && (
            <div className="message-box-panel">
              <PopupTop>
                <span className="message-box-title">消息盒子</span>
              </PopupTop>
              <div className="message-box-tabs">
                <button
                  type="button"
                  className={activeTab === TAB_RECENT ? 'active' : ''}
                  onClick={() => setActiveTab(TAB_RECENT)}
                >
                  最新评论
                </button>
                <button
                  type="button"
                  className={activeTab === TAB_FEATURED ? 'active' : ''}
                  onClick={() => setActiveTab(TAB_FEATURED)}
                >
                  精选评论
                </button>
              </div>
              <PopupMain>
                {loading ? (
                  <div className="message-box-loading">
                    <MaterialIcon type="hourglass_empty" />
                  </div>
                ) : (
                  <MessageList
                    items={activeTab === TAB_FEATURED ? featured : recent}
                    emptyText={
                      activeTab === TAB_FEATURED ? '暂无精选评论' : '暂无最新评论'
                    }
                  />
                )}
              </PopupMain>
            </div>
          )}
        </div>
      )}
    </ApiUrlConsumer>
  );
}
