import urlParse from 'url-parse';

export function formatInnerLink(url, baseUrl) {
  // url can be null/undefined (e.g. video whose original_media_url was removed
  // after transcoding). Bail out instead of crashing on url.replace below.
  if (!url) {
    return '';
  }

  let link = urlParse(url, {});

  if ('' === link.origin || 'null' === link.origin || !link.origin) {
    link = urlParse(baseUrl + '/' + url.replace(/^\//g, ''), {});
  }

  return link.toString();
}
