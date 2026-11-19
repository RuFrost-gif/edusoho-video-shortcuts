// ==UserScript==
// @name         EduSoho 视频快捷键（快进/回退/暂停/倍速）
// @namespace    https://github.com/rufrost
// @version      1.3.0
// @description  ← 回退 5s、→ 快进 5s、长按 → 2x 倍速、空格 暂停/播放，带可视化提示
// @author       霜
// @match        http://ftsitisi.aijdjy.com/*
// @match        https://ftsitisi.aijdjy.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  var STEP = 5;           // 单次快进/回退秒数
  var FAST_RATE = 2;      // 长按右方向键的倍速
  var LONG_PRESS_MS = 400; // 判定为「长按」的时长

  // ===== 可视化提示浮层（全屏时挂到全屏元素里，否则被全屏层遮住）=====
  var tip = null;
  var tipTimer = null;

  // 找到当前应挂载提示的父节点：全屏元素 > body
  function getTipHost() {
    var fs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
    if (fs && fs.appendChild) return fs;
    return document.body || document.documentElement;
  }

  function showTip(text, color, dur) {
    if (!tip) {
      tip = document.createElement('div');
      tip.style.cssText = [
        'position:fixed', 'right:24px', 'bottom:24px', 'z-index:2147483647',
        'background:rgba(0,0,0,.85)', 'color:#fff', 'font-size:18px',
        'font-weight:bold', 'padding:12px 20px', 'border-radius:6px',
        'pointer-events:none', 'transition:opacity .3s', 'opacity:0',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif',
        'max-width:70vw', 'white-space:pre-wrap', 'line-height:1.5'
      ].join(';');
    }
    // 每次显示前，把浮层挂到正确宿主（全屏元素或 body）
    var host = getTipHost();
    if (tip.parentNode !== host) host.appendChild(tip);
    tip.textContent = text;
    tip.style.background = color || 'rgba(0,0,0,.85)';
    tip.style.opacity = '1';
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () { tip.style.opacity = '0'; }, (dur || 900));
  }

  function log(msg) { console.log('[油猴·视频快捷键]', msg); }

  // ===== 找到可用的 video =====
  function findVideoInDoc(doc) {
    if (!doc) return null;
    var videos = Array.prototype.slice.call(doc.querySelectorAll('video'));
    if (!videos.length) return null;
    videos = videos.filter(function (v) {
      return v.offsetWidth > 0 || v.offsetHeight > 0 || v.videoWidth > 0;
    });
    if (!videos.length) return null;
    for (var i = 0; i < videos.length; i++) {
      if (!videos[i].paused) return videos[i];
    }
    videos.sort(function (a, b) {
      return (b.videoWidth * b.videoHeight) - (a.videoWidth * a.videoHeight);
    });
    return videos[0];
  }

  function findVideoDeep() {
    var v = findVideoInDoc(document);
    if (v) return v;
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      if (all[i].shadowRoot) {
        var sv = findVideoInDoc(all[i].shadowRoot);
        if (sv) return sv;
      }
    }
    var iframes = document.querySelectorAll('iframe');
    for (var j = 0; j < iframes.length; j++) {
      try {
        var inner = findVideoInDoc(iframes[j].contentDocument);
        if (inner) return inner;
      } catch (e) { /* 跨域跳过 */ }
    }
    return null;
  }

  function seek(delta) {
    var v = findVideoDeep();
    if (!v) return 'noplayer';
    var t = v.currentTime + delta;
    if (t < 0) t = 0;
    if (v.duration && t > v.duration) t = v.duration;
    try { v.currentTime = t; } catch (e) { return 'err'; }
    return 'ok';
  }

  function togglePlay() {
    var v = findVideoDeep();
    if (!v) return 'noplayer';
    try {
      if (v.paused) { v.play(); } else { v.pause(); }
    } catch (e) { return 'err'; }
    return v.paused ? 'paused' : 'playing';
  }

  function setRate(rate) {
    var v = findVideoDeep();
    if (!v) return 'noplayer';
    try { v.playbackRate = rate; } catch (e) { return 'err'; }
    return 'ok';
  }

  // ===== 长按右方向键 → 倍速 =====
  var rightDown = false;
  var longTimer = null;
  var fastActive = false;
  var savedRate = null;
  var wasLongPress = false; // 本次按键是否发生过长按，用于防止 keyup 时误补快进

  // 屏幕中间偏上的倍速提示框（独立于右下角浮层，常驻直到松手；全屏时挂到全屏元素）
  var fastBadge = null;
  function showFastBadge() {
    if (!fastBadge) {
      fastBadge = document.createElement('div');
      fastBadge.style.cssText = [
        'position:fixed', 'left:50%', 'top:30%', 'transform:translate(-50%,-50%)',
        'z-index:2147483647', 'background:rgba(0,0,0,.5)', 'color:#fff',
        'font-size:16px', 'font-weight:bold', 'padding:6px 14px', 'border-radius:4px',
        'pointer-events:none', 'opacity:0', 'transition:opacity .2s',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif',
        'letter-spacing:1px'
      ].join(';');
    }
    var host = getTipHost();
    if (fastBadge.parentNode !== host) host.appendChild(fastBadge);
    fastBadge.textContent = '2x 倍速中';
    fastBadge.style.opacity = '1';
  }
  function hideFastBadge() {
    if (fastBadge) fastBadge.style.opacity = '0';
  }

  function startFast() {
    if (fastActive) return;
    var v = findVideoDeep();
    if (!v) return;
    savedRate = v.playbackRate;
    fastActive = true;
    wasLongPress = true;
    v.playbackRate = FAST_RATE;
    showFastBadge();
  }

  function stopFast() {
    if (!fastActive) return;
    var v = findVideoDeep();
    if (v && savedRate != null) v.playbackRate = savedRate;
    fastActive = false;
    savedRate = null;
    hideFastBadge();
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

    var tag = (e.target && e.target.tagName) ? e.target.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) {
      return;
    }

    // 空格：暂停/播放
    if (e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar') {
      e.preventDefault();
      e.stopPropagation();
      var pr = togglePlay();
      if (pr === 'playing') showTip('▶ 播放', 'rgba(24,160,88,.9)');
      else if (pr === 'paused') showTip('⏸ 暂停', 'rgba(24,160,88,.9)');
      else if (pr === 'noplayer') showTip('未找到视频播放器', 'rgba(200,60,60,.92)');
      else showTip('操作失败', 'rgba(200,60,60,.92)');
      return;
    }

    // 左右方向键
    var isLeft = (e.key === 'ArrowLeft' || e.key === 'Left');
    var isRight = (e.key === 'ArrowRight' || e.key === 'Right');
    if (!isLeft && !isRight) return;

    e.preventDefault();
    e.stopPropagation();

    if (isRight && !e.repeat) {
      // 按下右方向键：启动长按计时
      rightDown = true;
      clearTimeout(longTimer);
      longTimer = setTimeout(function () {
        if (rightDown) startFast();
      }, LONG_PRESS_MS);
    } else if (isRight && e.repeat) {
      // 系统自动重复触发（按住不放），什么都不做，等长按计时器判定
      return;
    }

    // 单击（未进入长按）才快进
    if (isRight && e.repeat) return;
    if (isLeft) {
      // 左方向键直接回退，不受长按影响
      var r1 = seek(-STEP);
      if (r1 === 'ok') showTip('⏪ -' + STEP + 's', 'rgba(24,160,88,.9)');
      else if (r1 === 'noplayer') showTip('未找到视频播放器', 'rgba(200,60,60,.92)');
    }
  }

  function onKeyUp(e) {
    var isRight = (e.key === 'ArrowRight' || e.key === 'Right');
    if (!isRight) return;
    rightDown = false;
    clearTimeout(longTimer);

    // 若曾进入长按/倍速（无论是否已恢复），都不再补快进
    if (fastActive || wasLongPress) {
      if (fastActive) stopFast();
      wasLongPress = false;
      return;
    }

    // 短按才快进
    var r = seek(STEP);
    if (r === 'ok') showTip('⏩ +' + STEP + 's', 'rgba(24,160,88,.9)');
    else if (r === 'noplayer') showTip('未找到视频播放器', 'rgba(200,60,60,.92)');
  }

  // 挂到 window 捕获阶段（最顶层、最早收到），避免被页面代码 stopPropagation 拦截。
  // keydown 和 keyup 只各挂一层，防止重复触发。
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);

  // 双击页面空白处触发诊断（调试用）
  document.addEventListener('dblclick', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'VIDEO' || t.closest && t.closest('video'))) return;
    var lines = [];
    lines.push('video 数量: ' + document.querySelectorAll('video').length);
    lines.push('iframe 数量: ' + document.querySelectorAll('iframe').length);
    log(lines.join('\n'));
    showTip('诊断：\n' + lines.join('\n'), 'rgba(30,100,200,.94)', 4000);
  }, true);

  setTimeout(function () {
    log('脚本已就绪');
  }, 1200);
})();
