import React from 'react';
import { MaterialIcon } from '../_shared';
import { useBannerConfig } from '../../utils/bannerConfig';

import './WelcomeHeader.scss';

export function WelcomeHeader() {
  const banner = useBannerConfig();
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
        style={{
          backgroundImage: `url('${banner.banner_dark || '/static/images/lotus-brand/welcome-hero.webp'}')`,
          ...(null !== banner.dark_position ? { backgroundPosition: `center ${banner.dark_position}%` } : {}),
        }}
      />
      <div
        className="welcome-header-banner-bg welcome-header-banner-bg-paper"
        style={{
          backgroundImage: `url('${banner.banner_light || '/static/images/lotus-brand/welcome-hero-paper-chatgpt-v2.webp'}')`,
          ...(null !== banner.light_position ? { backgroundPosition: `center ${banner.light_position}%` } : {}),
        }}
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
