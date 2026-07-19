export function formatManagementTableDate(date) {
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  let ret = year + '年' + (date.getMonth() + 1) + '月' + day + '日';
  ret += ' ' + (hours < 10 ? '0' : '') + hours;
  ret += ':' + (minutes < 10 ? '0' : '') + minutes;
  ret += ':' + (seconds < 10 ? '0' : '') + seconds;
  return ret;
}
