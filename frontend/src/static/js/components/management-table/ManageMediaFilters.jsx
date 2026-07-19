import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { PageStore } from '../../utils/stores/';
import { FilterOptions } from '../_shared';

import './ManageItemList-filters.scss';

const filters = {
  state: [
    { id: 'all', title: '全部' },
    { id: 'public', title: '公开' },
    { id: 'private', title: '私有' },
    { id: 'unlisted', title: '未列出' },
  ],
  media_type: [
    { id: 'all', title: '全部' },
    { id: 'video', title: '视频' },
    { id: 'audio', title: '音频' },
    { id: 'image', title: '图像' },
    { id: 'pdf', title: 'PDF' },
  ],
  encoding_status: [
    { id: 'all', title: '全部' },
    { id: 'success', title: '成功' },
    { id: 'running', title: '运行中' },
    { id: 'pending', title: '等等' },
    { id: 'fail', title: '失败' },
  ],
  reviewed: [
    { id: 'all', title: '全部' },
    { id: 'true', title: '已审核' },
    { id: 'false', title: '未审核' },
  ],
  featured: [
    { id: 'all', title: '全部' },
    { id: 'true', title: '已精选' },
    { id: 'false', title: '未精选' },
  ],
};

export function ManageMediaFilters(props) {
  const [isHidden, setIsHidden] = useState(props.hidden);

  const [state, setState] = useState('all');
  const [mediaType, setMediaType] = useState('all');
  const [encodingStatus, setEncodingStatus] = useState('all');
  const [isFeatured, setIsFeatured] = useState('all');
  const [isReviewed, setIsReviewed] = useState('all');

  const containerRef = useRef(null);
  const innerContainerRef = useRef(null);

  function onWindowResize() {
    if (!isHidden) {
      containerRef.current.style.height = 24 + innerContainerRef.current.offsetHeight + 'px';
    }
  }

  function onFilterSelect(ev) {
    const args = {
      state: state,
      media_type: mediaType,
      encoding_status: encodingStatus,
      featured: isFeatured,
      is_reviewed: isReviewed,
    };

    switch (ev.currentTarget.getAttribute('filter')) {
      case 'state':
        args.state = ev.currentTarget.getAttribute('value');
        props.onFiltersUpdate(args);
        setState(args.state);
        break;
      case 'media_type':
        args.media_type = ev.currentTarget.getAttribute('value');
        props.onFiltersUpdate(args);
        setMediaType(args.media_type);
        break;
      case 'encoding_status':
        args.encoding_status = ev.currentTarget.getAttribute('value');
        props.onFiltersUpdate(args);
        setEncodingStatus(args.encoding_status);
        break;
      case 'featured':
        args.featured = ev.currentTarget.getAttribute('value');
        props.onFiltersUpdate(args);
        setIsFeatured(args.featured);
        break;
      case 'reviewed':
        args.is_reviewed = ev.currentTarget.getAttribute('value');
        props.onFiltersUpdate(args);
        setIsReviewed(args.is_reviewed);
        break;
    }
  }

  useEffect(() => {
    setIsHidden(props.hidden);
    onWindowResize();
  }, [props.hidden]);

  useEffect(() => {
    PageStore.on('window_resize', onWindowResize);
    return () => PageStore.removeListener('window_resize', onWindowResize);
  }, []);

  return (
    <div ref={containerRef} className={'mi-filters-row' + (isHidden ? ' hidden' : '')}>
      <div ref={innerContainerRef} className="mi-filters-row-inner">
        <div className="mi-filter">
          <div className="mi-filter-title">状态</div>
          <div className="mi-filter-options">
            <FilterOptions id={'state'} options={filters.state} selected={state} onSelect={onFilterSelect} />
          </div>
        </div>

        <div className="mi-filter">
          <div className="mi-filter-title">媒体类型</div>
          <div className="mi-filter-options">
            <FilterOptions
              id={'media_type'}
              options={filters.media_type}
              selected={mediaType}
              onSelect={onFilterSelect}
            />
          </div>
        </div>

        <div className="mi-filter">
          <div className="mi-filter-title">编码状态</div>
          <div className="mi-filter-options">
            <FilterOptions
              id={'encoding_status'}
              options={filters.encoding_status}
              selected={encodingStatus}
              onSelect={onFilterSelect}
            />
          </div>
        </div>

        <div className="mi-filter">
          <div className="mi-filter-title">审核状态</div>
          <div className="mi-filter-options">
            <FilterOptions id={'reviewed'} options={filters.reviewed} selected={isReviewed} onSelect={onFilterSelect} />
          </div>
        </div>

        <div className="mi-filter">
          <div className="mi-filter-title">精选状态</div>
          <div className="mi-filter-options">
            <FilterOptions id={'featured'} options={filters.featured} selected={isFeatured} onSelect={onFilterSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}

ManageMediaFilters.propTypes = {
  hidden: PropTypes.bool,
};

ManageMediaFilters.defaultProps = {
  hidden: false,
};
