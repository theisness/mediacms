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

function truncate(str, len = 42) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function parseMediaUrl(mediaUrl) {
  try {
    const url = new URL(mediaUrl, window.location.origin);
    const parts = url.pathname.split('/').filter(Boolean);
    // MediaCMS 媒体详情路径通常为 /v/{friendly_token} 或 /w/{friendly_token}
    const token = parts.length > 1 ? parts[parts.length - 1] : null;
    return { pathname: url.pathname, token };
  } catch (e) {
    return { pathname: mediaUrl, token: null };
  }
}

function MessageList({ items, emptyText }) {
  if (!items || !items.length) {
    return <div className="message-box-empty">{emptyText}</div>;
  }

  return (
    <ul className="message-list">
      {items.map((item) => {
        const { pathname } = parseMediaUrl(item.media_url);
        const commentAnchor = item.uid ? `#comment-${item.uid}` : '';
        return (
          <li key={item.uid} className="message-item">
            <a href={`${pathname}${commentAnchor}`} className="message-link">
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
  const { isAnonymous } = useUser();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(TAB_RECENT);
  const [recent, setRecent] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const cacheRef = useRef(null);

  useEffect(() => {
    const siteId = PageStore.get('config-site').id || 'mediacms-frontend';
    cacheRef.current = new BrowserCache('MediaCMS[' + siteId + '][messageBox]', CACHE_TTL_SECONDS);
  }, []);

  useEffect(() => {
    if (isAnonymous || !open || !cacheRef.current) return;

    const cacheKey = activeTab;
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Array.isArray(cached)) {
      if (activeTab === TAB_FEATURED) setFeatured(cached);
      else setRecent(cached);
      return;
    }

    setLoading(true);
    const apiUrl = PageStore.get('config-api') || {};
    const commentsUrl = apiUrl.comments;
    if (!commentsUrl) {
      setLoading(false);
      return;
    }

    const url =
      activeTab === TAB_FEATURED
        ? `${commentsUrl}?is_featured=true&page_size=5`
      : `${commentsUrl}?ordering=-add_date&page_size=5`;

    getRequest(
      url,
      true,
      (res) => {
        const results = res && res.data && res.data.results ? res.data.results : [];
        cacheRef.current.set(cacheKey, results);
        const visibleResults = results.slice(0, 5);
        if (activeTab === TAB_FEATURED) setFeatured(visibleResults);
        else setRecent(visibleResults);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
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

  const unreadCount = recent.length + featured.length > 0 ? recent.length + featured.length : 0;

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
