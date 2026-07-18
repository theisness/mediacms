module.exports = {
  devEnv: 'true' === process.env.WEBPACK_DEV_SERVER,
  id: process.env.MEDIACMS_ID || 'mediacms-frontend',
  title: process.env.MEDIACMS_TITLE || '莲花影院',
  url: process.env.MEDIACMS_URL || 'UNDEFINED_URL',
  api: process.env.MEDIACMS_API || 'UNDEFINED_API',
  theme: {
    mode: 'light', // Valid values: 'light', 'dark'.
    switch: {
      position: 'sidebar', // Valid values: 'header', 'sidebar'.
    },
  },
  logo: {
    lightMode: {
      svg: '',
      img: './static/images/lotus-brand/logo_lotus_paper.png',
    },
    darkMode: {
      svg: '',
      img: './static/images/lotus-brand/logo_lotus.png',
    },
  },
  pages: {
    latest: {
      title: '最新上传',
    },
    featured: {
      title: '精选影片',
    },
    recommended: {
      title: '推荐',
    },
    members: {
      title: '成员',
    },
  },
  userPages: {
    liked: {
      title: '喜欢的影片',
    },
    history: {
      title: '历史记录',
    },
  },
  taxonomies: {
    tags: {
      title: '标签',
    },
    categories: {
      title: '分类',
    },
  },
};
