import React, { useState, useRef, useEffect } from 'react';
import { MentionsInput, Mention } from 'react-mentions';
import PropTypes from 'prop-types';
import { format } from 'timeago.js';
import { usePopup } from '../../utils/hooks/';
import { PageStore, MediaPageStore } from '../../utils/stores/';
import { PageActions, MediaPageActions } from '../../utils/actions/';
import { LinksContext, MemberContext, SiteContext } from '../../utils/contexts/';
import {CircleIconButton, MaterialIcon, PopupMain, UserThumbnail} from '../_shared';
import { replaceString } from '../../utils/helpers/';

import './videojs-markers.js';
import './videojs.markers.css';
import { enableMarkers, addMarker } from './videojs-markers_config.js';
import { translateString } from '../../utils/helpers/';

import './Comments.scss';

const commentsText = {
  single: translateString('comment'),
  uppercaseSingle: translateString('COMMENT'),
  ucfirstSingle: translateString('Comment'),
  ucfirstPlural: translateString('Comments'),
  submitCommentText: translateString('SUBMIT'),
  disabledCommentsMsg: translateString('Comments are disabled'),
};

function CommentForm(props) {
  const textareaRef = useRef(null);

  const [value, setValue] = useState('');
  const [madeChanges, setMadeChanges] = useState(false);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const [textareaLineHeight, setTextareaLineHeight] = useState(-1);
  const [userList, setUsersList] = useState('');

  const [loginUrl] = useState(
    !MemberContext._currentValue.is.anonymous
      ? null
      : LinksContext._currentValue.signin +
          '?next=/' +
          window.location.href.replace(SiteContext._currentValue.url, '').replace(/^\//g, ''),
  );

  function onFocus() {
    setTextareaFocused(true);
  }

  function onBlur() {
    setTextareaFocused(false);
  }

  function onUsersLoad() {
    const userList = [...MediaPageStore.get('users')];
    const cleanList = [];
    userList.forEach((user) => {
      cleanList.push({ id: user.username, display: user.name });
    });

    setUsersList(cleanList);
  }

  function onCommentSubmit() {
    textareaRef.current.style.height = '';

    const contentHeight = textareaRef.current.scrollHeight;
    const contentLineHeight =
      0 < textareaLineHeight ? textareaLineHeight : parseFloat(window.getComputedStyle(textareaRef.current).lineHeight);

    setValue('');
    setMadeChanges(false);
    setTextareaLineHeight(contentLineHeight);

    textareaRef.current.style.height =
      Math.max(20, textareaLineHeight * Math.ceil(contentHeight / contentLineHeight)) + 'px';

    // 强制重新加载评论（可选）
    MediaPageStore.loadComments();
  }

  function onCommentSubmitFail() {
    setMadeChanges(false);
  }

  function onChangeWithMention(event, newValue, newPlainTextValue, mentions) {
    textareaRef.current.style.height = '';

    setValue(newValue);
    setMadeChanges(true);

    const contentHeight = textareaRef.current.scrollHeight;
    const contentLineHeight =
      0 < textareaLineHeight ? textareaLineHeight : parseFloat(window.getComputedStyle(textareaRef.current).lineHeight);
    setTextareaLineHeight(contentLineHeight);

    textareaRef.current.style.height =
      Math.max(20, textareaLineHeight * Math.ceil(contentHeight / contentLineHeight)) + 'px';
  }

  function onChange(event) {
    textareaRef.current.style.height = '';

    const contentHeight = textareaRef.current.scrollHeight;
    const contentLineHeight =
      0 < textareaLineHeight ? textareaLineHeight : parseFloat(window.getComputedStyle(textareaRef.current).lineHeight);

    setValue(textareaRef.current.value);
    setMadeChanges(true);
    setTextareaLineHeight(contentLineHeight);

    textareaRef.current.style.height =
      Math.max(20, textareaLineHeight * Math.ceil(contentHeight / contentLineHeight)) + 'px';
  }

  function submitComment() {
    if (!madeChanges) {
      return;
    }

    const val = value.trim();

    if ('' !== val) {
      let obj = {val};
      // 添加评论回复
      if( props.comment_type === 'reply'){
        obj.parent_id = props.reply_comment_id;
      }
      MediaPageActions.submitComment(obj);
    }
  }

  useEffect(() => {
    MediaPageStore.on('comment_submit', onCommentSubmit);
    MediaPageStore.on('comment_submit_fail', onCommentSubmitFail);
    if (MediaCMS.features.media.actions.comment_mention === true) {
      MediaPageStore.on('users_load', onUsersLoad);
    }

    return () => {
      MediaPageStore.removeListener('comment_submit', onCommentSubmit);
      MediaPageStore.removeListener('comment_submit_fail', onCommentSubmitFail);
      if (MediaCMS.features.media.actions.comment_mention === true) {
        MediaPageStore.removeListener('users_load', onUsersLoad);
      }
    };
  });

  return !MemberContext._currentValue.is.anonymous ? (
    <div className="comments-form">
      <div className="comments-form-inner">
        {props.comment_type==='new'?<UserThumbnail />:null}
        <div className="form">
          <div className={'form-textarea-wrap' + (textareaFocused ? ' focused' : '')}>
            {MediaCMS.features.media.actions.comment_mention ? (
              <MentionsInput
                inputRef={textareaRef}
                className="form-textarea"
                rows="1"
                placeholder={translateString('Add a') + commentsText.single + '...'}
                value={value}
                onChange={onChangeWithMention}
                onFocus={onFocus}
                onBlur={onBlur}
              >
                <Mention data={userList} markup="@(___id___)[___display___]" />
              </MentionsInput>
            ) : (
              <textarea
                ref={textareaRef}
                className="form-textarea"
                rows="1"
                placeholder={translateString('Add a') + commentsText.single + '...'}
                value={value}
                onChange={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
              ></textarea>
            )}
          </div>
          <div className="form-buttons">
            <button className={'' === value.trim() ? 'disabled' : ''} onClick={submitComment}>
              {commentsText.submitCommentText}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="comments-form">
      <div className="comments-form-inner">
        <UserThumbnail />
        <div className="form">
          <a
            href={loginUrl}
            rel="noffolow"
            className="form-textarea-wrap"
            title={translateString('Add a') + commentsText.single + '...'}
          >
            <span className="form-textarea">{translateString('Add a') + commentsText.single + '...'}</span>
          </a>
          <div className="form-buttons">
            <a href={loginUrl} rel="noffolow" className="disabled">
              {commentsText.submitCommentText}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

CommentForm.propTypes = {
  comment_type: PropTypes.oneOf(['new', 'reply']),
  media_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  reply_comment_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

CommentForm.defaultProps = {
  comment_type: 'new',
};

const ENABLED_COMMENTS_READ_MORE = false;

function CommentActions(props) {
  const [popupContentRef, PopupContent, PopupTrigger] = usePopup();
  const [liked, setLiked] = useState(props.liked || false); // 支持 props 初始化

  function handleLikeClick() {
    if (liked) {
      MediaPageActions.unlikeComment(props.comment_id); // 取消点赞
    } else {
      MediaPageActions.likeComment(props.comment_id); // 添加点赞
    }
    setLiked(!liked); // 切换状态
    MediaPageStore.loadComments(); // 可选：重新加载评论以更新状态
  }
  function cancelCommentRemoval() {
    popupContentRef.current.toggle();
  }

  function proceedCommentRemoval() {
    popupContentRef.current.toggle();
    MediaPageActions.deleteComment(props.comment_id);
    MediaPageStore.loadComments();
  }


  return (
    <span className="comment-actions">
      {/* 点赞按钮 */}
      <div className={`comment-action like-action  ${liked ? 'liked' : ''}`}>
        <CircleIconButton onClick={handleLikeClick}>
          <MaterialIcon type="thumb_up" />
        </CircleIconButton>
        <span className="likes-num">{props.likes || 0}</span>
      </div>
      {/*<div className="comment-action like-action"><CircleIconButton><MaterialIcon type="thumb_up" /></CircleIconButton><span className="likes-num">145</span></div>*/}
      {/*<div className="comment-action dislike-action"><CircleIconButton><MaterialIcon type="thumb_down" /></CircleIconButton><span className="dislikes-num">19</span></div>*/}
      <span className="comment-action reply-comment">
        <button onClick={props.onReplyClick}>
          {props.showReplyForm ? '取消' : '回复'}
        </button>
      </span>

      {MemberContext._currentValue.username===props.username ? (
        <span className="comment-action remove-comment">
          <PopupTrigger contentRef={popupContentRef}>
            <button>
              删除评论
            </button>
          </PopupTrigger>

          <PopupContent contentRef={popupContentRef}>
            <PopupMain>
              <div className="popup-message">
                <span className="popup-message-title">删除评论</span>
                <span className="popup-message-main">确认永久删除评论吗？所有该评论的回复也会被删除！</span>
              </div>
              <hr />
              <span className="popup-message-bottom">
                <button className="button-link cancel-comment-removal" onClick={cancelCommentRemoval}>
                  取消
                </button>
                <button className="button-link proceed-comment-removal" onClick={proceedCommentRemoval}>
                  确认删除
                </button>
              </span>
            </PopupMain>
          </PopupContent>
        </span>
      ) : null}
    </span>
  );
}

function Comment(props) {
  const commentTextRef = useRef(null);
  const commentTextInnerRef = useRef(null);

  const [viewMoreContent, setViewMoreContent] = useState(!ENABLED_COMMENTS_READ_MORE || false);
  const [enabledViewMoreContent, setEnabledViewMoreContent] = useState(false);

  function onWindowResize() {
    const newval = enabledViewMoreContent || commentTextInnerRef.offsetHeight > commentTextRef.offsetHeight;
    setEnabledViewMoreContent(newval);
    setViewMoreContent(newval || false);
  }

  function toggleMore() {
    setViewMoreContent(!viewMoreContent);
  }

  useEffect(() => {
    if (ENABLED_COMMENTS_READ_MORE) {
      PageStore.on('window_resize', onWindowResize);
      setEnabledViewMoreContent(commentTextInnerRef.offsetHeight > commentTextRef.offsetHeight);
    }

    return () => {
      if (ENABLED_COMMENTS_READ_MORE) {
        PageStore.removeListener('window_resize', onWindowResize);
      }
    };
  }, []);

  function parseComment(text) {
    return { __html: text.replace(/\n/g, `<br />`) };
  }

  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleReplyClick = () => {
    setShowReplyForm(!showReplyForm);
  };

  // 是否显示评论回复的按钮
  const [showAllReplies, setShowAllReplies] = useState(false);
  let MAX_VISIBLE_REPLIES = props.is_sub ? 0 : 2;

  function renderMainComments (){
    return (
        <div className="comment-inner">
        <a className="comment-author-thumb" href={props.author_link} title={props.author_name}>
          <img src={props.author_thumb} alt={props.author_name}/>
        </a>
        <div className="comment-content">
          <div className="comment-meta">
            <div className="comment-author">
              <a href={props.author_link} title={props.author_name}>
                {props.author_name}
              </a>
            </div>
          </div>
          <div ref={commentTextRef} className={'comment-text' + (viewMoreContent ? ' show-all' : '')}>
            <div
                ref={commentTextInnerRef}
                className="comment-text-inner"
                dangerouslySetInnerHTML={parseComment(props.text)}
            ></div>
          </div>
          <div className="comment-meta-bottom">
            <div className="comment-date">{formatDate(props.publish_date)}</div>
            <CommentActions username={props.username} comment_id={props.comment_id} likes={props.likes} liked={props.liked}
                            onReplyClick={handleReplyClick}
                            showReplyForm={showReplyForm}/>
          </div>
        </div>
          {/*<div className="comment-inner">
          <a className="comment-author-thumb" href={props.author_link} title={props.author_name}>
            <img src={props.author_thumb} alt={props.author_name}/>
          </a>
          <div className="comment-content">
            <div className="comment-meta">
              <a className="comment-author" href={props.author_link} title={props.author_name}>
                {props.author_name}
              </a>
              <span ref={commentTextRef} className={'comment-text' + (viewMoreContent ? ' show-all' : '')}>
                <span
                    ref={commentTextInnerRef}
                    className="comment-text-inner"
                    dangerouslySetInnerHTML={parseComment(props.text)}
                ></span>
            </span>
            </div>
            <div className="comment-meta-bottom">
              <span className="comment-date">{formatDate(props.publish_date)}</span>
              <CommentActions username={props.username} comment_id={props.comment_id} likes={props.likes} liked={props.liked}
                              onReplyClick={handleReplyClick}
                              showReplyForm={showReplyForm}/>
            </div>
          </div>
        </div>*/
          }
      </div>
    )
  }
  function renderSubComments (){
    return (
      <div className="comment-inner">
        <a className="comment-author-thumb-small" href={props.author_link} title={props.author_name}>
          <img src={props.author_thumb} alt={props.author_name}/>
        </a>
        <div className="comment-content-sub">
          <div className="comment-meta">
            <a className="comment-author" href={props.author_link} title={props.author_name}>
              {props.author_name}
            </a>
            <span ref={commentTextRef} className={'comment-text' + (viewMoreContent ? ' show-all' : '')}>
                <span
                    ref={commentTextInnerRef}
                    className="comment-text-inner"
                    dangerouslySetInnerHTML={parseComment(props.text)}
                ></span>
            </span>
          </div>
          <div className="comment-meta-bottom">
            <span className="comment-date">{formatDate(props.publish_date)}</span>

            <CommentActions username={props.username} comment_id={props.comment_id} likes={props.likes} liked={props.liked}
                            onReplyClick={handleReplyClick}
                            showReplyForm={showReplyForm}/>
          </div>
        </div>
      </div>)
  }

  function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
  return (
    <div className="comment" id={props.comment_id ? `comment-${props.comment_id}` : undefined}>
      {/* 渲染本评论，子评论更小，主评论更大 */}
      {props.is_sub ? renderSubComments():renderMainComments()}
      {/* 如果 showReplyForm 为 true，则显示 CommentForm */}
      {showReplyForm && (
          <div className="reply-form-container">
            <CommentForm
                comment_type="reply"
                media_id={props.media_id}
                reply_comment_id={props.id}
            />
          </div>
      )}
      {/* 渲染子评论（children） */}
      {Array.isArray(props.children) && props.children.length > 0 && (
          <div>
            <div className="replies">
              {props.children.slice(0, showAllReplies ? undefined : MAX_VISIBLE_REPLIES).map(c => (
                  <Comment
                      is_sub={true}
                      id={c.id}
                      key={c.uid}
                      comment_id={c.uid}
                      media_id={props.media_id}
                      text={c.text}
                      author_name={c.author_name}
                      author_link={c.author_profile}
                      author_thumb={SiteContext._currentValue.url + '/' + c.author_thumbnail_url.replace(/^\//g, '')}
                      publish_date={c.add_date}
                      likes={c.likes}
                      liked={c.liked}
                      dislikes={0}
                      children={c.children || []}
                      user_id={c.user_id}
                      username={c.username}
                  />
              ))}
            </div>
            <div className="replies-more">
              {/* 显示“展开更多”按钮 */}
              {!showAllReplies && props.children.length > MAX_VISIBLE_REPLIES && (
                  <button className="show-more-replies" onClick={() => setShowAllReplies(true)}>
                    显示下面 {props.children.length - MAX_VISIBLE_REPLIES} 条回复
                  </button>
              )}
              {showAllReplies && props.children.length > MAX_VISIBLE_REPLIES && (
                  <button className="show-more-replies" onClick={() => setShowAllReplies(false)}>
                    收起回复
                  </button>
              )}
            </div>
          </div>
      )}
      {enabledViewMoreContent ? (
          <button className="toggle-more" onClick={toggleMore}>
            {viewMoreContent ? '显示更少' : '显示更多'}
          </button>
      ) : null}
    </div>
  );
}

Comment.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  comment_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  media_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  text: PropTypes.string,
  author_name: PropTypes.string,
  author_link: PropTypes.string,
  author_thumb: PropTypes.string,
  publish_date: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  likes: PropTypes.number, //点赞数
  dislikes: PropTypes.number,
  children: PropTypes.array, // 回复评论
  is_sub: PropTypes.bool, // 是否是子评论
  user_id: PropTypes.number, //用户id
  username:PropTypes.string,//用户名（不是昵称）
  liked: PropTypes.bool, //是否已点赞
};

Comment.defaultProps = {
  author_name: '',
  author_link: '#',
  publish_date: 0,
  likes: 0,
  dislikes: 0,
  is_sub: false,
  liked: false,
};

function displayCommentsRelatedAlert() {
  // TODO: Improve this and move it into Media Page code.

  var pageMainEl = document.querySelector('.page-main');
  var noCommentDiv = pageMainEl.querySelector('.no-comment');

  const postUploadMessage = PageStore.get('config-contents').uploader.postUploadMessage;

  if ('' === postUploadMessage) {
    if (noCommentDiv && 0 === comm.length) {
      noCommentDiv.parentNode.removeChild(noCommentDiv);
    }
  } else if (0 === comm.length && 'unlisted' === MediaPageStore.get('media-data').state) {
    if (-1 < LinksContext._currentValue.profile.media.indexOf(MediaPageStore.get('media-data').author_profile)) {
      if (!noCommentDiv) {
        const missingCommentariesUnlistedMsgElem = document.createElement('div');

        missingCommentariesUnlistedMsgElem.setAttribute('role', 'alert');
        missingCommentariesUnlistedMsgElem.setAttribute('class', 'alert info alert-dismissible no-comment');
        missingCommentariesUnlistedMsgElem.innerHTML =
          '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>' +
          postUploadMessage;

        if (pageMainEl.firstChild) {
          pageMainEl.insertBefore(missingCommentariesUnlistedMsgElem, pageMainEl.firstChild);
        } else {
          pageMainEl.appendChild(missingCommentariesUnlistedMsgElem);
        }

        missingCommentariesUnlistedMsgElem.querySelector('button.close').addEventListener('click', function (ev) {
          missingCommentariesUnlistedMsgElem.setAttribute('class', 'alert info alert-dismissible hiding');
          setTimeout(function () {
            missingCommentariesUnlistedMsgElem.parentNode.removeChild(missingCommentariesUnlistedMsgElem);
          }, 400);
          ev.preventDefault();
          ev.stopPropagation();
          return false;
        });
      }
    }
  } else if (noCommentDiv && 0 < comm.length) {
    noCommentDiv.parentNode.removeChild(noCommentDiv);
  }
}

const CommentsListHeader = ({ commentsLength }) => {
  return (
    <>
      {!MemberContext._currentValue.can.readComment || MediaPageStore.get('media-data').enable_comments ? null : (
        <span className="disabled-comments-msg">{commentsText.disabledCommentsMsg}</span>
      )}

      {MemberContext._currentValue.can.readComment &&
      (MediaPageStore.get('media-data').enable_comments || MemberContext._currentValue.can.editMedia) ? (
        <h2>
          {commentsLength
            ? 1 < commentsLength
              ? commentsLength + ' ' + commentsText.ucfirstPlural
              : commentsLength + ' ' + commentsText.ucfirstSingle
            : MediaPageStore.get('media-data').enable_comments
            ? translateString('No comments yet')
            : ''}
        </h2>
      ) : null}
    </>
  );
};

export default function CommentsList(props) {
  const [mediaId, setMediaId] = useState(MediaPageStore.get('media-id'));

  const [comments, setComments] = useState(
    MemberContext._currentValue.can.readComment ? MediaPageStore.get('media-comments') : [],
  );

  const [displayComments, setDisplayComments] = useState(false);

  function onCommentsLoad() {
    const retrievedComments = [...MediaPageStore.get('media-comments')];

    retrievedComments.forEach((comment) => {
      comment.text = setMentions(setTimestampAnchors(comment.text));
    });

    displayCommentsRelatedAlert();
    setComments([...retrievedComments]);
  }

  function setTimestampAnchors(text) {
    function wrapTimestampWithAnchor(match, string) {
      let split = match.split(':'),
        s = 0,
        m = 1;
      let searchParameters = new URLSearchParams(window.location.search);

      while (split.length > 0) {
        s += m * parseInt(split.pop(), 10);
        m *= 60;
      }
      searchParameters.set('t', s);

      let mediaUrl = MediaPageStore.get('media-url').split('?')[0] + '?' + searchParameters;

      const wrapped = '<a href="' + mediaUrl + '">' + match + '</a>';
      return wrapped;
    }

    const timeRegex = new RegExp('((\\d)?\\d:)?(\\d)?\\d:\\d\\d', 'g');
    return text.replace(timeRegex, wrapTimestampWithAnchor);
  }

  function setMentions(text) {
    let sanitizedComment = text.split('@(_').join('<a href="/user/');
    sanitizedComment = sanitizedComment.split('_)[_').join('">@');
    return sanitizedComment.split('_]').join('</a>');
  }

  function setTimestampAnchorsAndMarkers(text, videoPlayer) {
    function wrapTimestampWithAnchor(match, string) {
      let split = match.split(':'),
        s = 0,
        m = 1;
      let searchParameters = new URLSearchParams(window.location.search);

      while (split.length > 0) {
        s += m * parseInt(split.pop(), 10);
        m *= 60;
      }
      if (MediaCMS.features.media.actions.timestampTimebar) {
        addMarker(videoPlayer, s, text);
      }

      searchParameters.set('t', s);
      const wrapped =
        '<a href="' + MediaPageStore.get('media-url').split('?')[0] + '?' + searchParameters + '">' + match + '</a>';
      return wrapped;
    }

    const timeRegex = new RegExp('((\\d)?\\d:)?(\\d)?\\d:\\d\\d', 'g');
    return text.replace(timeRegex, wrapTimestampWithAnchor);
  }

  function onCommentSubmit(commentId) {
    onCommentsLoad();
    // FIXME: Without delay creates conflict [ Uncaught Error: Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch. ].
    setTimeout(() => PageActions.addNotification(translateString('Comments added'), 'commentSubmit'), 100);
  }

  function onCommentSubmitFail() {
    // FIXME: Without delay creates conflict [ Uncaught Error: Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch. ].
    setTimeout(
      () => PageActions.addNotification('评论提交失败', 'commentSubmitFail'),
      100,
    );
  }

  function onCommentDelete(commentId) {
    onCommentsLoad();
    // FIXME: Without delay creates conflict [ Uncaught Error: Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch. ].
    setTimeout(() => PageActions.addNotification('评论已删除', 'commentDelete'), 100);
  }

  function onCommentDeleteFail(commentId) {
    // FIXME: Without delay creates conflict [ Uncaught Error: Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch. ].
    setTimeout(
      () => PageActions.addNotification('评论删除失败', 'commentDeleteFail'),
      100,
    );
  }

  function onCommentLike(commentId) {
    onCommentsLoad();
    setTimeout(() => PageActions.addNotification('点赞成功', 'commentLike'), 100);
  }

  function onCommentLikeFail(commentId) {
    setTimeout(() => PageActions.addNotification('点赞失败', 'commentLikeFail'), 100);
  }

  useEffect(() => {
    setDisplayComments(
      comments.length &&
        MemberContext._currentValue.can.readComment &&
        (MediaPageStore.get('media-data').enable_comments || MemberContext._currentValue.can.editMedia),
    );
  }, [comments]);

  // 消息盒子跳转到 /v/{token}#comment-{uid} 时，评论是异步加载的；
  // 等列表挂载后再滚动一次，确保锚点在真实 DOM 中生效。
  useEffect(() => {
    if (!displayComments || !window.location.hash) return;
    const anchorId = decodeURIComponent(window.location.hash.slice(1));
    const anchor = document.getElementById(anchorId);
    if (anchor) {
      requestAnimationFrame(() => anchor.scrollIntoView({ block: 'center' }));
    }
  }, [comments, displayComments]);

  useEffect(() => {
    MediaPageStore.on('comments_load', onCommentsLoad);
    MediaPageStore.on('comment_submit', onCommentSubmit);
    MediaPageStore.on('comment_submit_fail', onCommentSubmitFail);
    MediaPageStore.on('comment_delete', onCommentDelete);
    MediaPageStore.on('comment_delete_fail', onCommentDeleteFail);
    MediaPageStore.on('comment_like', onCommentLike); // 新增
    MediaPageStore.on('comment_like_fail', onCommentLikeFail); // 新增

    return () => {
      MediaPageStore.removeListener('comments_load', onCommentsLoad);
      MediaPageStore.removeListener('comment_submit', onCommentSubmit);
      MediaPageStore.removeListener('comment_submit_fail', onCommentSubmitFail);
      MediaPageStore.removeListener('comment_delete', onCommentDelete);
      MediaPageStore.removeListener('comment_delete_fail', onCommentDeleteFail);
      MediaPageStore.removeListener('comment_like', onCommentLike); // 新增
      MediaPageStore.removeListener('comment_like_fail', onCommentLikeFail); // 新增
    };
  }, []);

  // 递归显示评论数量，包含children
  function countTotalComments(comments) {
    return comments.reduce((total, comment) => {
      return total + 1 + (comment.children ? countTotalComments(comment.children) : 0);
    }, 0);
  }

  return (
    <div className="comments-list">
      <div className="comments-list-inner">
        <CommentsListHeader commentsLength={countTotalComments(comments)} />

        {MediaPageStore.get('media-data').enable_comments ? <CommentForm media_id={mediaId} /> : null}

        {displayComments
          ? comments.map((c) => {
              return (
                <Comment id={c.id}
                  key={c.uid}
                  comment_id={c.uid}
                  media_id={mediaId}
                  text={c.text}
                  author_name={c.author_name}
                  author_link={c.author_profile}
                  author_thumb={SiteContext._currentValue.url + '/' + c.author_thumbnail_url.replace(/^\//g, '')}
                  publish_date={c.add_date}
                  likes={c.likes}
                  liked={c.liked}
                  dislikes={0}
                  children={c.children || []}
                  user_id={c.user_id}
                  username={c.username}
                />
              );
            })
          : null}
      </div>
    </div>
  );
}
