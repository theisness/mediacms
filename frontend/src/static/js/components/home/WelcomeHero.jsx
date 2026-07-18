import React from 'react';
import { LinksConsumer } from '../../utils/contexts/';
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
            className="welcome-hero-bg"
            src="/static/images/lotus-brand/welcome-hero.png"
            alt="莲花影院"
            loading="eager"
          />
          <div className="welcome-hero-overlay" />
          <div className="welcome-hero-content">
            <h1 className="welcome-hero-title">
              <span className="welcome-hero-line">观一花一世界</span>
              <span className="welcome-hero-line">赏一影一菩提</span>
            </h1>
            <p className="welcome-hero-subtitle">
              莲花影院 · 清净视听，以影像传递智慧与安宁
            </p>
            <nav className="welcome-hero-actions">
              <a href={links.featured} className="welcome-hero-button primary">
                <MaterialIcon type="star" />
                <span>精选影片</span>
              </a>
              <a href={links.latest} className="welcome-hero-button">
                <MaterialIcon type="new_releases" />
                <span>最新上传</span>
              </a>
              <a href={links.archive.categories} className="welcome-hero-button">
                <MaterialIcon type="list_alt" />
                <span>分类浏览</span>
              </a>
              <a href={links.user.addMedia} className="welcome-hero-button">
                <MaterialIcon type="video_call" />
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
