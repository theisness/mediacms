module.exports = {
  header: {
    right: '',
  },
  sidebar: {
    navMenuItems: [
      {
        text: '关于',
        link: './about.html',
        icon: 'contact_support',
      },
      {
        text: '条款',
        link: './terms.html',
        icon: 'description',
      },
      {
        text: '联系',
        link: './contact.html',
        icon: 'alternate_email',
      },
    ],
    belowNavMenu: null,
    footer:
      '莲花影院 · 以影像传递智慧与安宁<br>' +
      '<a href="https://beian.miit.gov.cn/" title="赣ICP备2025053972号-3" target="_blank">赣ICP备2025053972号-3</a>',
  },
  uploader: {
    belowUploadArea: '',
    postUploadMessage: '',
  },
  notifications: {
    messages: {
      addToLiked: '已加入喜欢的影片',
      removeFromLiked: '已从喜欢的影片移除',
      addToDisliked: '已加入不喜欢的影片',
      removeFromDisliked: '已从不喜欢的影片移除',
    },
  },
};
