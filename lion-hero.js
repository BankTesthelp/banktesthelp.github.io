/* lion-hero.js — interactive lion mascot hero (BankTest.pk)
 *
 * Loads a GRID sprite sheet built by ~/workspace/lion-hero/build_sprite.py
 * plus its JSON config, then scrubs frames on a <canvas> so the lion's gaze
 * follows the visitor's pointer across the hero section:
 *   pointer X over the hero  ->  target frame (linear, 0 .. frameCount-1)
 *   eased toward the target every rAF (lerp 0.12, snap when close)
 *   pointer leaves           ->  ease back to frame 0 (idle / center pose)
 *
 * Smoothness: the eased position is a FLOAT. Each paint draws frame
 * floor(pos) fully opaque, then frame floor(pos)+1 with
 * globalAlpha = fractional part — a crossfade that makes scrubbing feel
 * buttery instead of stepping frame to frame.
 *
 * Config contract (lion-sprite-config.json, by build_sprite.py):
 *   { frameCount, frameWidth, frameHeight, cols, rows,
 *     spriteWidth, spriteHeight, sprite }
 * Frame i sits at column (i % cols), row floor(i / cols). Configs without
 * cols/rows fall back to a single horizontal strip.
 * Paths are resolved relative to this script ( -> ).
 *
 * Robustness contract:
 *  - The canvas becomes visible (.is-live) ONLY after the first sprite
 *    frame has actually painted. Until then — and on ANY failure (config
 *    fetch, sprite decode, bad config) — the static fallback image
 *    (<img class="lion-fallback">) simply stays visible. No errors thrown.
 *  - The config fetch is retried once (some free hosts intermittently
 *    answer a first request with a challenge page instead of the JSON).
 */
(function () {
  'use strict';

  var LERP = 0.12;
  var SNAP = 0.01;

  function init() {
    var hero = document.getElementById('lionHero');
    var wrap = document.getElementById('lionVisual');
    var canvas = document.getElementById('lionCanvas');
    if (!hero || !wrap || !canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolve  from this script's URL (lion-hero.js).
    var base = '';
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      var m = src.match(/^(.*\/)assets\/js\/lion-hero\.js(?:[?#].*)?$/);
      if (m) { base = m[1] + ''; break; }
    }

    function fetchConfig(attempt) {
      return fetch(base + 'lion-sprite-config.json?v=3', { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('config ' + res.status);
          return res.json();
        })
        .catch(function (err) {
          if (attempt < 1) {
            return new Promise(function (resolve) {
              window.setTimeout(resolve, 800);
            }).then(function () { return fetchConfig(attempt + 1); });
          }
          throw err;
        });
    }

    fetchConfig(0)
      .then(function (cfg) {
        var img = new Image();
        img.onload = function () {
          // decode() forces a full decode before first paint where supported,
          // so a broken/oversized sheet fails here instead of painting blank.
          if (img.decode) {
            img.decode().then(function () { start(cfg, img); }, function () { start(cfg, img); });
          } else {
            start(cfg, img);
          }
        };
        img.onerror = function () { /* keep static fallback */ };
        img.src = base + (cfg.sprite || 'lion-sprite.webp');
      })
      .catch(function () { /* keep static fallback */ });

    function start(cfg, sprite) {
      var count = cfg.frameCount | 0;
      var fw = cfg.frameWidth | 0;
      var fh = cfg.frameHeight | 0;
      var cols = cfg.cols | 0;
      if (!count || !fw || !fh) return;
      if (!cols || cols < 1) cols = count; // legacy single-strip configs

      var current = 0;      // eased frame position (float)
      var target = 0;       // where the pointer wants the gaze
      var painted = -1;     // last float position actually painted
      var visible = true;
      var rafId = null;
      var dw = 0, dh = 0, dx = 0, dy = 0; // cover-fit destination rect

      function sizeCanvas() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = wrap.clientWidth;
        var h = wrap.clientHeight;
        if (!w || !h) return;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        // "cover" fit: scale the frame to fill the canvas, cropping the
        // overflow symmetrically — no distortion whatever the box aspect.
        var scale = Math.max(canvas.width / fw, canvas.height / fh);
        dw = fw * scale;
        dh = fh * scale;
        dx = (canvas.width - dw) / 2;
        dy = (canvas.height - dh) / 2;
      }

      function drawFrame(idx, alpha) {
        var col = idx % cols;
        var row = Math.floor(idx / cols);
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, col * fw, row * fh, fw, fh, dx, dy, dw, dh);
      }

      function paint() {
        if (Math.abs(current - painted) < 0.001) return;
        painted = current;
        var f0 = Math.floor(current);
        var frac = current - f0;
        if (f0 < 0) f0 = 0;
        if (f0 > count - 1) { f0 = count - 1; frac = 0; }
        var f1 = Math.min(f0 + 1, count - 1);
        drawFrame(f0, 1);
        if (frac > 0.001 && f1 !== f0) drawFrame(f1, frac);
        ctx.globalAlpha = 1;
      }

      function tick() {
        var diff = target - current;
        if (Math.abs(diff) < SNAP) {
          current = target;
        } else {
          current += diff * LERP;
        }
        paint();
        rafId = window.requestAnimationFrame(tick);
      }

      function startLoop() {
        if (rafId === null) rafId = window.requestAnimationFrame(tick);
      }
      function stopLoop() {
        if (rafId !== null) { window.cancelAnimationFrame(rafId); rafId = null; }
      }

      function setTargetFromClientX(clientX) {
        var rect = hero.getBoundingClientRect();
        if (!rect.width) return;
        var t = (clientX - rect.left) / rect.width;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        target = t * (count - 1);
      }

      // Go live ONLY after the first frame has really painted: size the
      // canvas, paint frame 0, then reveal the canvas over the fallback.
      sizeCanvas();
      paint();
      wrap.classList.add('is-live');

      var reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) return; // static center pose only

      hero.addEventListener('pointermove', function (e) { setTargetFromClientX(e.clientX); });
      hero.addEventListener('pointerdown', function (e) { setTargetFromClientX(e.clientX); });
      hero.addEventListener('pointerleave', function () { target = 0; });
      hero.addEventListener('pointercancel', function () { target = 0; });
      // Touch fallback (pointer events cover modern browsers; this is belt & braces).
      hero.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches.length) setTargetFromClientX(e.touches[0].clientX);
      }, { passive: true });
      hero.addEventListener('touchend', function () { target = 0; });

      var resizeTimer = null;
      window.addEventListener('resize', function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(function () {
          sizeCanvas();
          painted = -1; // force repaint at the new size
          paint();
        }, 120);
      });

      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          if (visible) startLoop(); else stopLoop();
        }, { threshold: 0.05 });
        io.observe(hero);
      }
      startLoop();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
