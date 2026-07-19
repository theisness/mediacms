import React, { useEffect, useState } from 'react';
import { ApiUrlContext } from '../../utils/contexts/';
import { getRequest } from '../../utils/helpers/';

import './CategoryStrip.scss';

const ICON_BASE = '/static/images/lotus-brand/cat-icons/';

// 类别标题 → icon 文件名（白线稿透明底 PNG，经 CSS mask 上主题色）
const CATEGORY_ICONS = {
  常识类: 'changshi.png',
  故事类: 'gushi.png',
  法义类: 'fayi.png',
  真人秀: 'zhenrenxiu.png',
  记录片: 'jilupian.png',
  纪录片: 'jilupian.png',
  预告片: 'yugaopian.png',
};

const DEFAULT_ICON = 'lotus.png';
const HOT_ICON = 'hot.png';

function categoryIcon(title) {
  return ICON_BASE + (CATEGORY_ICONS[title] || DEFAULT_ICON);
}

function Tile({ href, icon, title, subtitle, hot }) {
  return (
    <a className={'category-strip-tile' + (hot ? ' category-strip-tile-hot' : '')} href={href} title={title}>
      <span className="category-strip-icon" style={{ maskImage: `url(${icon})`, WebkitMaskImage: `url(${icon})` }} />
      <span className="category-strip-text">
        <span className="category-strip-title">{title}</span>
        {subtitle ? <span className="category-strip-count">{subtitle}</span> : null}
      </span>
    </a>
  );
}

export function CategoryStrip() {
  const [categories, setCategories] = useState(null);

  useEffect(() => {
    let alive = true;
    getRequest(
      ApiUrlContext._currentValue.archive.categories,
      true,
      (response) => {
        if (alive && response && response.data && response.data.length) {
          setCategories(response.data);
        }
      },
      () => {}
    );
    return () => {
      alive = false;
    };
  }, []);

  if (!categories) {
    return null;
  }

  return (
    <nav className="category-strip" aria-label="影片类别">
      <Tile href="/popular" icon={ICON_BASE + HOT_ICON} title="热门" subtitle="按播放量" hot />
      {categories.map((c) => (
        <Tile
          key={c.title}
          href={'/search?c=' + encodeURIComponent(c.title)}
          icon={categoryIcon(c.title)}
          title={c.title}
          subtitle={c.media_count ? c.media_count + ' 部' : null}
        />
      ))}
    </nav>
  );
}
