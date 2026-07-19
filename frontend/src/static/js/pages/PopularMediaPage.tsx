import React from 'react';
import { ApiUrlConsumer } from '../utils/contexts/';
import { PageStore } from '../utils/stores/';
import { MediaListWrapper } from '../components/MediaListWrapper';
import { LazyLoadItemListAsync } from '../components/item-list/LazyLoadItemListAsync';
import { Page } from './Page';

interface PopularMediaPageProps {
  id?: string;
  title?: string;
}

export const PopularMediaPage: React.FC<PopularMediaPageProps> = ({
  id = 'popular-media',
  title = '热门影片',
}) => (
  <Page id={id}>
    <ApiUrlConsumer>
      {(apiUrl) => (
        <MediaListWrapper title={title} className="items-list-ver">
          <LazyLoadItemListAsync
            requestUrl={apiUrl.media + '?show=popular'}
            hideViews={!PageStore.get('config-media-item').displayViews}
            hideAuthor={!PageStore.get('config-media-item').displayAuthor}
            hideDate={!PageStore.get('config-media-item').displayPublishDate}
          />
        </MediaListWrapper>
      )}
    </ApiUrlConsumer>
  </Page>
);
