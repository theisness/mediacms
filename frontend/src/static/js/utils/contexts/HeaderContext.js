import React, { createContext } from 'react';
import { config as mediacmsConfig } from '../settings/config.js';
import { translateString } from '../../utils/helpers/';

const config = mediacmsConfig(window.MediaCMS);

const links = config.url;
const theme = config.theme;
const user = config.member;

// 主题入口统一放在头像菜单；只有显式 disabled 才关闭，兼容旧配置未提供 enabled 的情况。
const hasThemeSwitcher = !theme.switch || false !== theme.switch.enabled;

function popupTopNavItems() {
  const items = [];

  if (!user.is.anonymous) {
    if (user.can.addMedia) {
      items.push({
        link: links.user.addMedia,
        icon: 'video_call',
        text: translateString('Upload media'),
        itemAttr: {
          className: 'visible-only-in-small',
        },
      });

      if (user.pages.media) {
        items.push({
          link: user.pages.media,
          icon: 'video_library',
          text: translateString('My media'),
        });
      }
    }

    if (user.can.saveMedia && user.pages.playlists) {
      items.push({
        link: user.pages.playlists,
        icon: 'playlist_play',
        iconSrc: '/static/images/lotus-brand/nav-icons/playlists.png',
        text: translateString('My playlists'),
      });
    }

    if (config.enabled.pages.history && config.enabled.pages.history.enabled) {
      items.push({
        link: links.user.history,
        icon: 'history',
        iconSrc: '/static/images/lotus-brand/nav-icons/history.png',
        text: translateString('History'),
      });
    }

    if (user.can.likeMedia && config.enabled.pages.liked && config.enabled.pages.liked.enabled) {
      items.push({
        link: links.user.liked,
        icon: 'thumb_up',
        iconSrc: '/static/images/lotus-brand/nav-icons/liked.png',
        text: translateString('Liked media'),
      });
    }
  }

  return items;
}

function popupMiddleNavItems() {
  const items = [];

  if (hasThemeSwitcher) {
    items.push({
      itemType: 'open-subpage',
      icon: 'brightness_4',
      iconPos: 'left',
      text: translateString('Switch theme'),
      buttonAttr: {
        className: 'change-page',
        'data-page-id': 'switch-theme',
      },
    });
  }

  if (user.is.anonymous) {
    if (user.can.login) {
      items.push({
        itemType: 'link',
        icon: 'login',
        iconPos: 'left',
        text: translateString('Sign in'),
        link: links.signin,
        linkAttr: {
          className: hasThemeSwitcher ? 'visible-only-in-small' : 'visible-only-in-extra-small',
        },
      });
    }

    if (user.can.register) {
      items.push({
        itemType: 'link',
        icon: 'person_add',
        iconPos: 'left',
        text: translateString('Register'),
        link: links.register,
        linkAttr: {
          className: hasThemeSwitcher ? 'visible-only-in-small' : 'visible-only-in-extra-small',
        },
      });
    }
  } else {
    items.push({
      link: links.user.editProfile,
      icon: 'brush',
      text: translateString('Edit profile'),
    });

    if (user.can.changePassword) {
      items.push({
        link: links.changePassword,
        icon: 'lock',
        text: translateString('Change password'),
      });
    }
  }

  return items;
}

function popupBottomNavItems() {
  const items = [];

  if (!user.is.anonymous) {
    if (user.is.admin && config.enabled.pages.members && config.enabled.pages.members.enabled) {
      items.push({
        link: links.members,
        icon: 'people',
        iconSrc: '/static/images/lotus-brand/nav-icons/members.png',
        text: translateString('Members'),
      });
    }

    if (user.can.manageMedia) {
      items.push({
        link: links.manage.media,
        icon: 'video_settings',
        iconSrc: '/static/images/lotus-brand/nav-icons/manage-media.png',
        text: translateString('Manage media'),
      });
    }

    if (user.can.manageUsers) {
      items.push({
        link: links.manage.users,
        icon: 'manage_accounts',
        iconSrc: '/static/images/lotus-brand/nav-icons/manage-users.png',
        text: translateString('Manage users'),
      });
    }

    if (user.can.manageComments) {
      items.push({
        link: links.manage.comments,
        icon: 'comment_bank',
        iconSrc: '/static/images/lotus-brand/nav-icons/manage-comments.png',
        text: translateString('Manage comments'),
      });
    }
  }

  if (user.is.admin) {
    items.push({
      link: links.admin,
      icon: 'admin_panel_settings',
      text: translateString('Administration Portal'),
    });
  }

  if (!user.is.anonymous) {
    items.push({
      link: links.signout,
      icon: 'exit_to_app',
      text: translateString('Sign out'),
    });
  }

  return items;
}

export const HeaderContext = createContext({
  hasThemeSwitcher,
  popupNavItems: {
    top: popupTopNavItems(),
    middle: popupMiddleNavItems(),
    bottom: popupBottomNavItems(),
  },
});

export const HeaderConsumer = HeaderContext.Consumer;
