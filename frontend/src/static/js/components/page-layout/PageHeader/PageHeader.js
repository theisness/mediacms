import React, { useEffect, useState } from 'react';
import { PageStore } from '../../../utils/stores/';
import { useUser, useLayout } from '../../../utils/hooks/';
import { addClassname, hasSeenWelcome } from '../../../utils/helpers/';
import { SearchField } from './SearchField';
import { HeaderRight } from './HeaderRight';
import { HeaderLeft } from './HeaderLeft';
import { WelcomeHeader } from '../../home/WelcomeHeader';

import '../../../../css/styles.scss';
import './PageHeader.scss';
import '../PageMain.scss';

function Alerts() {
  function onClickAlertClose() {
    const alertElem = this.parentNode;

    addClassname(alertElem, 'hiding');

    setTimeout(
      function () {
        if (alertElem && alertElem.parentNode) {
          alertElem.parentNode.removeChild(alertElem);
        }
      }.bind(this),
      400
    );
  }

  setTimeout(
    function () {
      const closeBtn = document.querySelectorAll('.alert.alert-dismissible .close');

      let i;
      if (closeBtn.length) {
        i = 0;
        while (i < closeBtn.length) {
          closeBtn[i].addEventListener('click', onClickAlertClose);
          i += 1;
        }
      }
    }.bind(this),
    1000
  ); // TODO: Improve this.
}

function MediaUploader() {
  let uploaderWrap = document.querySelector('.media-uploader-wrap');

  if (uploaderWrap) {
    let preUploadMsgEl = document.createElement('div');

    preUploadMsgEl.setAttribute('class', 'pre-upload-msg');
    preUploadMsgEl.innerHTML = PageStore.get('config-contents').uploader.belowUploadArea;

    uploaderWrap.appendChild(preUploadMsgEl);
  }
}

export function PageHeader(props) {
  const { isAnonymous } = useUser();
  const { visibleMobileSearch } = useLayout();
  // 首次进入时保持 false，避免 HomePage 的大欢迎页与紧凑横幅同时出现；
  // 之后的新页面加载保持 true，PJAX 导航期间也能持续使用同一条 hero 背景。
  const [showWelcomeHeader] = useState(() => hasSeenWelcome());

  useEffect(() => {
    Alerts();

    if (void 0 === PageStore.get('current-page') || 'add-media' === PageStore.get('current-page')) {
      MediaUploader();
    }
  }, []);

  return (
    <>
      <header
        className={
          'page-header' +
          (visibleMobileSearch ? ' mobile-search-field' : '') +
          (isAnonymous ? ' anonymous-user' : '') +
          (showWelcomeHeader ? ' welcome-banner-active' : '')
        }
      >
        <HeaderLeft />
        <SearchField />
        <HeaderRight />
      </header>
      {showWelcomeHeader && <WelcomeHeader />}
    </>
  );
}
