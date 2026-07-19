import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import urlParse from 'url-parse';

import MediaPlayer from 'mediacms-player/dist/mediacms-player.js';
import 'mediacms-player/dist/mediacms-player.css';
import vjsZhCN from 'video.js/dist/lang/zh-CN.json';

import './VideoPlayer.scss';

export function formatInnerLink(url, baseUrl) {
  let link = urlParse(url, {});

  if ('' === link.origin || 'null' === link.origin || !link.origin) {
    link = urlParse(baseUrl + '/' + url.replace(/^\//g, ''), {});
  }

  return link.toString();
}

export function VideoPlayerError(props) {
  return (
    <div className="error-container">
      <div className="error-container-inner">
        <span className="icon-wrap">
          <i className="material-icons">error_outline</i>
        </span>
        <span className="msg-wrap">{props.errorMessage}</span>
      </div>
    </div>
  );
}

VideoPlayerError.propTypes = {
  errorMessage: PropTypes.string.isRequired,
};

export function VideoPlayer(props) {
  const videoElemRef = useRef(null);

  let player = null;

  const playerStates = {
    playerVolume: props.playerVolume,
    playerSoundMuted: props.playerSoundMuted,
    videoQuality: props.videoQuality,
    videoPlaybackSpeed: props.videoPlaybackSpeed,
    inTheaterMode: props.inTheaterMode,
  };

  playerStates.playerVolume =
    null === playerStates.playerVolume ? 1 : Math.max(Math.min(Number(playerStates.playerVolume), 1), 0);
  playerStates.playerSoundMuted = null !== playerStates.playerSoundMuted ? playerStates.playerSoundMuted : !1;
  playerStates.videoQuality = null !== playerStates.videoQuality ? playerStates.videoQuality : 'Auto';
  playerStates.videoPlaybackSpeed = null !== playerStates.videoPlaybackSpeed ? playerStates.videoPlaybackSpeed : !1;
  playerStates.inTheaterMode = null !== playerStates.inTheaterMode ? playerStates.inTheaterMode : !1;

  function onClickNext() {
    if (void 0 !== props.onClickNextCallback) {
      props.onClickNextCallback();
    }
  }

  function onClickPrevious() {
    if (void 0 !== props.onClickPreviousCallback) {
      props.onClickPreviousCallback();
    }
  }

  function onPlayerStateUpdate(newState) {
    if (playerStates.playerVolume !== newState.volume) {
      playerStates.playerVolume = newState.volume;
    }

    if (playerStates.playerSoundMuted !== newState.soundMuted) {
      playerStates.playerSoundMuted = newState.soundMuted;
    }

    if (playerStates.videoQuality !== newState.quality) {
      playerStates.videoQuality = newState.quality;
    }

    if (playerStates.videoPlaybackSpeed !== newState.playbackSpeed) {
      playerStates.videoPlaybackSpeed = newState.playbackSpeed;
    }

    if (playerStates.inTheaterMode !== newState.theaterMode) {
      playerStates.inTheaterMode = newState.theaterMode;
    }

    if (void 0 !== props.onStateUpdateCallback) {
      props.onStateUpdateCallback(newState);
    }
  }

  function initPlayer() {
    if (null !== player || null !== props.errorMessage) {
      return;
    }

    if (!props.inEmbed) {
      window.removeEventListener('focus', initPlayer);
      document.removeEventListener('visibilitychange', initPlayer);
    }

    if (!videoElemRef.current) {
      return;
    }

    if (!props.inEmbed) {
      videoElemRef.current.focus(); // Focus on player before instance init.
    }

    const subtitles = {
      on: false,
    };

    if (void 0 !== props.subtitlesInfo && null !== props.subtitlesInfo && props.subtitlesInfo.length) {
      subtitles.languages = [];

      let i = 0;
      while (i < props.subtitlesInfo.length) {
        if (
          void 0 !== props.subtitlesInfo[i].src &&
          void 0 !== props.subtitlesInfo[i].srclang &&
          void 0 !== props.subtitlesInfo[i].label
        ) {
          subtitles.languages.push({
            src: formatInnerLink(props.subtitlesInfo[i].src, props.siteUrl),
            srclang: props.subtitlesInfo[i].srclang,
            label: props.subtitlesInfo[i].label,
          });
        }

        i += 1;
      }

      if (subtitles.languages.length) {
        subtitles.on = true;
      }
    }

    // 带触摸屏的桌面/笔记本上 videojs.TOUCH_ENABLED 为 true，会让播放器走移动端逻辑：
    // 进度条 hover 缩略图预览组件被 `!TOUCH_ENABLED` 门控而根本不初始化，且出现触摸覆盖层灰蒙。
    // 对「能用鼠标 hover」的设备(any-hover:hover)在建播放器前关掉该标志，按桌面初始化（恢复 hover 预览）。
    // 纯触摸手机/平板(any-hover:none)不命中，保留原触摸 UI。
    const _vjs = typeof window !== 'undefined' && window.videojs ? window.videojs : typeof videojs !== 'undefined' ? videojs : null;
    if (
      _vjs &&
      _vjs.TOUCH_ENABLED &&
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(any-hover: hover)').matches
    ) {
      // 播放器的预览图门控读 videojs.TOUCH_ENABLED（可写普通属性）；置 false 即让其按桌面初始化。
      // 注意：videojs.browser.TOUCH_ENABLED 是只读，赋值会抛异常中断 initPlayer，绝不要碰它。try/catch 兜底。
      try {
        _vjs.TOUCH_ENABLED = false;
      } catch (e) {
        /* 个别构建里可能是只读属性，忽略即可 */
      }
    }

    // 播放器 UI 中文化：注册 video.js 官方 zh-CN 语言包并设为全局默认语言，
    // 之后创建的播放器（含 vendor MediaPlayer 内部的 videojs）都用中文控件文案。
    if (_vjs) {
      try {
        _vjs.addLanguage('zh-CN', vjsZhCN);
        _vjs.options.language = 'zh-CN';
      } catch (e) {
        /* 语言包注册失败不阻断播放器创建 */
      }
    }

    player = new MediaPlayer(
      videoElemRef.current,
      {
        enabledTouchControls: true,
        sources: props.sources,
        poster: props.poster,
        autoplay: props.enableAutoplay,
        bigPlayButton: true,
        controlBar: {
          theaterMode: props.hasTheaterMode,
          pictureInPicture: false,
          next: props.hasNextLink ? true : false,
          previous: props.hasPreviousLink ? true : false,
        },
        subtitles: subtitles,
        cornerLayers: props.cornerLayers,
        videoPreviewThumb: props.previewSprite,
      },
      {
        volume: playerStates.playerVolume,
        soundMuted: playerStates.playerSoundMuted,
        theaterMode: playerStates.inTheaterMode,
        theSelectedQuality: void 0, // @note: Allow auto resolution selection by sources order.
        theSelectedPlaybackSpeed: playerStates.videoPlaybackSpeed || 1,
      },
      props.info,
      [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      onPlayerStateUpdate,
      onClickNext,
      onClickPrevious
    );

    if (void 0 !== props.onPlayerInitCallback) {
      props.onPlayerInitCallback(player, videoElemRef.current);
    }
  }

  function unsetPlayer() {
    if (null === player) {
      return;
    }
    videojs(videoElemRef.current).dispose();
    player = null;
  }

  useEffect(() => {
    if (props.inEmbed || document.hasFocus() || 'visible' === document.visibilityState) {
      initPlayer();
    } else {
      window.addEventListener('focus', initPlayer);
      document.addEventListener('visibilitychange', initPlayer);
    }

    /*
      // We don't need this because we have a custom function in frontend/src/static/js/components/media-viewer/VideoViewer/index.js:617
      player && player.player.one('loadedmetadata', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paramT = Number(urlParams.get('t'));
      const timestamp = !isNaN(paramT) ? paramT : 0;
      player.player.currentTime(timestamp);
    }); */

    return () => {
      unsetPlayer();

      if (void 0 !== props.onUnmountCallback) {
        props.onUnmountCallback();
      }
    };
  }, []);

  return null === props.errorMessage ? (
    <video ref={videoElemRef} className="video-js vjs-mediacms native-dimensions"></video>
  ) : (
    <div className="error-container">
      <div className="error-container-inner">
        <span className="icon-wrap">
          <i className="material-icons">error_outline</i>
        </span>
        <span className="msg-wrap">{props.errorMessage}</span>
      </div>
    </div>
  );
}

VideoPlayer.propTypes = {
  playerVolume: PropTypes.string,
  playerSoundMuted: PropTypes.bool,
  videoQuality: PropTypes.string,
  videoPlaybackSpeed: PropTypes.number,
  inTheaterMode: PropTypes.bool,
  siteId: PropTypes.string.isRequired,
  siteUrl: PropTypes.string.isRequired,
  errorMessage: PropTypes.string,
  cornerLayers: PropTypes.object,
  subtitlesInfo: PropTypes.array.isRequired,
  inEmbed: PropTypes.bool.isRequired,
  sources: PropTypes.array.isRequired,
  info: PropTypes.object.isRequired,
  enableAutoplay: PropTypes.bool.isRequired,
  hasTheaterMode: PropTypes.bool.isRequired,
  hasNextLink: PropTypes.bool.isRequired,
  hasPreviousLink: PropTypes.bool.isRequired,
  poster: PropTypes.string,
  previewSprite: PropTypes.object,
  onClickPreviousCallback: PropTypes.func,
  onClickNextCallback: PropTypes.func,
  onPlayerInitCallback: PropTypes.func,
  onStateUpdateCallback: PropTypes.func,
  onUnmountCallback: PropTypes.func,
};

VideoPlayer.defaultProps = {
  errorMessage: null,
  cornerLayers: {},
};
