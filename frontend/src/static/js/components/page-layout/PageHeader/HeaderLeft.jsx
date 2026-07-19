import React from 'react';
import { PageStore } from '../../../utils/stores/';
import { LinksConsumer } from '../../../utils/contexts/';
import { useLayout } from '../../../utils/hooks/';
import { CircleIconButton } from '../../_shared';
import { translateString } from '../../../utils/helpers/';

export function HeaderLeft() {
  const { toggleMobileSearch } = useLayout();

  function primaryItems(links) {
    const enabled = PageStore.get('config-enabled').pages;
    return [
      { href: links.home, label: '首页', icon: 'home', className: 'header-nav-home' },
      enabled.featured && enabled.featured.enabled
      ? { href: links.featured, label: translateString('Featured'), icon: 'featured', className: 'header-nav-featured' }
        : null,
      enabled.recommended && enabled.recommended.enabled
        ? { href: links.recommended, label: translateString('Recommended'), icon: 'recommended', className: 'header-nav-recommended' }
        : null,
      enabled.latest && enabled.latest.enabled
        ? { href: links.latest, label: translateString('Latest'), icon: 'latest', className: 'header-nav-latest' }
        : null,
    ].filter(Boolean);
  }

  return (
    <LinksConsumer>
      {(links) => (
        <div className="page-header-left">
          <div>
            <div className="close-search-field">
              <CircleIconButton onClick={toggleMobileSearch}>
                <i className="material-icons">arrow_back</i>
              </CircleIconButton>
            </div>
            <nav className="header-primary-nav" aria-label="主要频道">
              {primaryItems(links).map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={
                    item.className +
                    (window.location.pathname.replace(/\/$/, '') === item.href.replace(/\/$/, '') ? ' active' : '')
                  }
                >
                  <img src={`/static/images/lotus-brand/nav-icons/${item.icon}.png`} alt="" aria-hidden="true" />
                  {item.label}
                </a>
              ))}
            </nav>
            {PageStore.get('config-contents').header.onLogoRight ? (
              <div
                className="on-logo-right"
                dangerouslySetInnerHTML={{ __html: PageStore.get('config-contents').header.onLogoRight }}
              ></div>
            ) : null}
          </div>
        </div>
      )}
    </LinksConsumer>
  );
}
