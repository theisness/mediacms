import React from 'react';
import { LinksConsumer } from '../../utils/contexts/';
import { PageStore } from '../../utils/stores/';
import { MaterialIcon } from '../_shared';

import './WelcomeHero.scss';

export const WelcomeHero = () => {
  const scrollToContent = () => {
    const isAbout =
      typeof window !== 'undefined' &&
      (window.location.pathname === '/about.html' || window.location.pathname === '/about');

    if (isAbout) {
      window.location.href = './index.html';
      return;
    }

    const content = document.querySelector('.media-list-wrapper');
    if (content) {
      content.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <LinksConsumer>
      {(links) => (
        <section className="welcome-hero">
          <img
            className="welcome-hero-bg welcome-hero-bg-dark"
            src="/static/images/lotus-brand/welcome-hero.webp"
            alt="莲花影院"
            loading="eager"
          />
          <img
            className="welcome-hero-bg welcome-hero-bg-paper"
            src="/static/images/lotus-brand/welcome-hero-paper-chatgpt-v2.webp"
            alt=""
            aria-hidden="true"
            loading="eager"
          />
          <div className="welcome-hero-overlay" />
          <div className="welcome-hero-content">
            <h1 className="welcome-hero-title">
              <span className="welcome-hero-line">观一花一世界</span>
              <span className="welcome-hero-line">赏一影一菩提</span>
            </h1>
            <nav className="welcome-hero-actions">
              <a href={links.home} className="welcome-hero-button home">
                <img src="/static/images/lotus-brand/nav-icons/home.png" alt="" aria-hidden="true" />
                <span>首页</span>
              </a>
              <a href={links.featured} className="welcome-hero-button primary">
                <img src="/static/images/lotus-brand/nav-icons/featured.png" alt="" aria-hidden="true" />
                <span>精选影片</span>
              </a>
              {PageStore.get('config-enabled').pages.recommended &&
                PageStore.get('config-enabled').pages.recommended.enabled && (
                <a href={links.recommended} className="welcome-hero-button">
                  <img src="/static/images/lotus-brand/nav-icons/recommended.png" alt="" aria-hidden="true" />
                  <span>推荐影片</span>
                </a>
              )}
              <a href={links.latest} className="welcome-hero-button">
                <img src="/static/images/lotus-brand/nav-icons/latest.png" alt="" aria-hidden="true" />
                <span>最新上传</span>
              </a>
              <a href={links.archive.categories} className="welcome-hero-button">
                <img src="/static/images/lotus-brand/nav-icons/categories.png" alt="" aria-hidden="true" />
                <span>分类浏览</span>
              </a>
              {PageStore.get('config-enabled').taxonomies.tags &&
                PageStore.get('config-enabled').taxonomies.tags.enabled && (
                <a href={links.archive.tags} className="welcome-hero-button">
                  <img src="/static/images/lotus-brand/nav-icons/tags.png" alt="" aria-hidden="true" />
                  <span>标签浏览</span>
                </a>
              )}
              <a href={links.user.addMedia} className="welcome-hero-button">
                <img src="/static/images/lotus-brand/nav-icons/upload.png" alt="" aria-hidden="true" />
                <span>上传作品</span>
              </a>
            </nav>
          </div>
          <button type="button" className="welcome-hero-scroll" onClick={scrollToContent} aria-label="向下滚动">
            <MaterialIcon type="expand_more" />
          </button>
        </section>
      )}
    </LinksConsumer>
  );
};
