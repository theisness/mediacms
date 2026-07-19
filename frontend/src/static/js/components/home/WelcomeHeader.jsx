import React from 'react';
import { MaterialIcon } from '../_shared';

import './WelcomeHeader.scss';

export function WelcomeHeader() {
  function handleScroll() {
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
  }

  return (
    <section className="welcome-header-banner">
      <div
        className="welcome-header-banner-bg welcome-header-banner-bg-dark"
        style={{ backgroundImage: "url('/static/images/lotus-brand/welcome-hero.webp')" }}
      />
      <div
        className="welcome-header-banner-bg welcome-header-banner-bg-paper"
        style={{ backgroundImage: "url('/static/images/lotus-brand/welcome-hero-paper-chatgpt-v2.webp')" }}
        aria-hidden="true"
      />
      <div className="welcome-header-banner-content">
        <img
          className="welcome-header-banner-wordmark"
          src="/static/images/lotus-brand/lotus-wordmark-chatgpt.png"
          alt="莲花影院"
        />
      </div>
      <button
        type="button"
        className="welcome-header-banner-scroll"
        onClick={handleScroll}
        aria-label="向下滚动或回首页"
      >
        <MaterialIcon type="expand_more" />
      </button>
    </section>
  );
}
