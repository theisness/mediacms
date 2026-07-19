// 站点全中文：所有格式统一输出「YYYY年M月D日」，忽略英文月份缩写的老格式区分。
export default function publishedOnDate(date, type) {
  if (date instanceof Date) {
    return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
  }
  return null;
}
