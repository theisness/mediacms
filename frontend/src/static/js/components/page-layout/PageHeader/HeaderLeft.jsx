import React from 'react';
import { PageStore } from '../../../utils/stores/';
import { LinksConsumer } from '../../../utils/contexts/';
import { useLayout } from '../../../utils/hooks/';
import { CircleIconButton } from '../../_shared';

export function HeaderLeft() {
  const { enabledSidebar, toggleMobileSearch, toggleSidebar } = useLayout();

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
            {enabledSidebar ? (
              <div className="toggle-sidebar">
                <CircleIconButton onClick={toggleSidebar}>
                  <i className="material-icons">menu</i>
                </CircleIconButton>
              </div>
            ) : null}
            <div className="logo header-home-link">
              <a href={links.home} title="首页">
                <span>首页</span>
              </a>
            </div>
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
