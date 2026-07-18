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
        className="welcome-header-banner-bg"
        style={{ backgroundImage: "url('/static/images/lotus-brand/welcome-hero.webp')" }}
      />
      <div className="welcome-header-banner-content">
        <span className="welcome-header-banner-title">莲花影院</span>
        <span className="welcome-header-banner-subtitle">清净视听，以影像传递智慧与安宁</span>
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
