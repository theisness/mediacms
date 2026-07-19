// 莲花影院默认中文翻译映射
// 组件里用 translateString('英文') 的文案，会优先从这里取中文

export const ZH_TRANSLATIONS = {
  // 导航 / 页面
  Home: '首页',
  Featured: '精选影片',
  Recommended: '推荐',
  Latest: '最新上传',
  Tags: '标签',
  Categories: '分类',
  Members: '成员',
  Upload: '上传',
  About: '关于',
  Contact: '联系',
  Terms: '条款',
  History: '历史',
  'My media': '我的媒体',
  'My playlists': '我的播放列表',
  'Liked media': '喜欢的影片',
  Playlists: '播放列表',
  Media: '影片',

  // 头部 / 用户
  'Sign in': '登录',
  Register: '注册',
  'Sign out': '退出登录',
  'Upload media': '上传影片',
  'Edit profile': '编辑个人资料',
  'Change password': '更改密码',
  'Administration Portal': '管理员门户',
  'Manage media': '管理影片',
  'Manage users': '管理用户',
  'Manage comments': '管理评论',
  'Switch theme': '切换主题',

  // 列表 / 操作
  'VIEW ALL': '查看全部',
  'SHOW MORE': '加载更多',
  SHARE: '分享',
  SAVE: '保存',
  SUBMIT: '提交',
  COMMENT: '评论',
  Comment: '评论',
  Comments: '评论',
  'Comments added': '已发表评论',
  'Comments are disabled': '评论已关闭',
  'No comments yet': '暂无评论',
  'Published on': '发布于',
  'Up Next': '即将播放',
  'Up next': '即将播放',

  // 媒体项
  'Edit media': '编辑影片',
  'EDIT MEDIA': '编辑影片',
  'EDIT SUBTITLE': '编辑字幕',
  'Edit subtitle': '编辑字幕',
  'DELETE MEDIA': '删除影片',
  view: '播放',
  views: '播放',
  comment: '评论',

  // 搜索
  Search: '搜索',
  'Add a': '添加',

  // 其他
  Language: '语言',
  Category: '分类',
  Tag: '标签',
  AUTOPLAY: '自动连播',
  Settings: '设置',
  'RSS feeds': 'RSS 订阅',
  Filter: '筛选',
  'More videos': '更多影片',
};

export function installTranslations() {
  if (typeof window !== 'undefined') {
    window.TRANSLATION = { ...(window.TRANSLATION || {}), ...ZH_TRANSLATIONS };
  }
}

// 模块被 import 即安装：部分模块（如 HeaderContext）在模块顶层就调用
// translateString 生成菜单项，晚于 import 求值的显式 installTranslations() 调用救不了它们。
installTranslations();
