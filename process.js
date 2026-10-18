/* 压片 LiteShot · 图像处理核心（主线程与 Web Worker 共用）。全部在本机完成，不发起任何网络请求。 */
(function (root) {
  var FONT = '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC",system-ui,sans-serif';

  function mkCanvas(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    var c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  function toBlob(c, type, q) {
    if (c.convertToBlob) return c.convertToBlob({ type: type, quality: q });
    return new Promise(function (res) { c.toBlob(res, type, q); });
  }
  function place(w, h, bw, bh, p, m) {
    var x, y;
    var col = p.charAt(1), row = p.charAt(0);
    x = col === 'l' ? m : col === 'r' ? w - bw - m : (w - bw) / 2;
    y = row === 't' ? m : row === 'b' ? h - bh - m : (h - bh) / 2;
    return [x, y];
  }
  function drawWatermark(ctx, w, h, wm, logo) {
    if (!wm) return;
    var margin = Math.round(Math.min(w, h) * 0.03);
    if (wm.textOn && wm.text) {
      var fs = Math.max(10, Math.round(Math.min(w, h) * wm.textSize / 100));
      ctx.save();
      ctx.globalAlpha = wm.textOpacity / 100;
      ctx.font = '600 ' + fs + 'px ' + FONT;
      ctx.fillStyle = wm.textColor;
      ctx.textBaseline = 'middle';
      var tw = ctx.measureText(wm.text).width;
      if (wm.tile) {
        ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 6); ctx.textAlign = 'center';
        var gx = tw + fs * 3, gy = fs * 4, R = Math.hypot(w, h), row = 0;
        for (var y = -R; y <= R; y += gy, row++) {
          var off = (row % 2) ? gx / 2 : 0;
          for (var x = -R; x <= R; x += gx) ctx.fillText(wm.text, x + off, y);
        }
      } else {
        ctx.textAlign = 'left';
        var pp = place(w, h, tw, fs, wm.textPos, margin);
        ctx.fillText(wm.text, pp[0], pp[1] + fs / 2);
      }
      ctx.restore();
    }
    if (wm.imgOn && logo) {
      var lw = Math.max(8, Math.round(w * wm.imgScale / 100));
      var lh = Math.round(lw * logo.height / logo.width);
      var q = place(w, h, lw, lh, wm.imgPos, margin);
      ctx.save(); ctx.globalAlpha = wm.imgOpacity / 100;
      ctx.drawImage(logo, q[0], q[1], lw, lh); ctx.restore();
    }
  }

  function outType(o, file) {
    if (o.format === 'jpeg') return 'image/jpeg';
    if (o.format === 'webp') return 'image/webp';
    if (o.format === 'png') return 'image/png';
    var t = (file.type || '').toLowerCase();
    if (t === 'image/jpeg' || t === 'image/webp' || t === 'image/png') return t;
    return 'image/png';
  }
  var EXT = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png' };

  function targetSize(o, sw, sh) {
    var W = sw, H = sh, dw, dh, dx = 0, dy = 0, s;
    if (o.mode === 'none') return { W: sw, H: sh, dw: sw, dh: sh, dx: 0, dy: 0 };
    var tw = Math.max(1, o.w | 0), th = Math.max(1, o.h | 0);
    if (o.mode === 'fit') {
      s = Math.min(tw / sw, th / sh); if (o.noUpscale) s = Math.min(s, 1);
      dw = Math.max(1, Math.round(sw * s)); dh = Math.max(1, Math.round(sh * s));
      return { W: dw, H: dh, dw: dw, dh: dh, dx: 0, dy: 0 };
    }
    if (o.mode === 'pad') {
      s = Math.min(tw / sw, th / sh); if (o.noUpscale) s = Math.min(s, 1);
      dw = Math.max(1, Math.round(sw * s)); dh = Math.max(1, Math.round(sh * s));
      return { W: tw, H: th, dw: dw, dh: dh, dx: Math.round((tw - dw) / 2), dy: Math.round((th - dh) / 2) };
    }
    s = Math.max(tw / sw, th / sh); // cover
    dw = Math.round(sw * s); dh = Math.round(sh * s);
    return { W: tw, H: th, dw: dw, dh: dh, dx: Math.round((tw - dw) / 2), dy: Math.round((th - dh) / 2) };
  }

  async function processImage(file, o, logoBlob) {
    var bmp = await createImageBitmap(file);
    var logo = null;
    try {
      if (o.wm && o.wm.imgOn && logoBlob) logo = await createImageBitmap(logoBlob);
      var sw = bmp.width, sh = bmp.height;
      var t = targetSize(o, sw, sh);
      var c = mkCanvas(t.W, t.H), ctx = c.getContext('2d');
      var type = outType(o, file);
      var opaque = type === 'image/jpeg' || !o.transparent;
      if (opaque) { ctx.fillStyle = o.bg || '#ffffff'; ctx.fillRect(0, 0, t.W, t.H); }
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      // 大幅缩小时分步减半，画质更稳
      var src = bmp, sx = bmp.width, sy = bmp.height, tmp = null;
      while (sx / 2 >= t.dw && sy / 2 >= t.dh && sx > 64) {
        var nx = Math.max(1, Math.round(sx / 2)), ny = Math.max(1, Math.round(sy / 2));
        var c2 = mkCanvas(nx, ny), x2 = c2.getContext('2d');
        x2.imageSmoothingQuality = 'high'; x2.drawImage(src, 0, 0, nx, ny);
        src = c2; sx = nx; sy = ny;
      }
      ctx.drawImage(src, t.dx, t.dy, t.dw, t.dh);
      drawWatermark(ctx, t.W, t.H, o.wm, logo);
      var blob, q = o.quality;
      if (type === 'image/png') {
        blob = await toBlob(c, type);
      } else {
        blob = await toBlob(c, type, q);
        if (o.maxKB > 0) { // 目标体积上限：二分查找质量
          var cap = o.maxKB * 1024;
          if (blob.size > cap) {
            var lo = 0.3, hi = q, best = null;
            for (var i = 0; i < 6; i++) {
              var mid = (lo + hi) / 2, b = await toBlob(c, type, mid);
              if (b.size <= cap) { best = b; lo = mid; } else { hi = mid; }
            }
            blob = best || await toBlob(c, type, 0.3);
          }
        }
      }
      return { blob: blob, w: t.W, h: t.H, type: type, ext: EXT[type], capMiss: o.maxKB > 0 && blob.size > o.maxKB * 1024 };
    } finally {
      bmp.close && bmp.close(); logo && logo.close && logo.close();
    }
  }

  root.LS = { processImage: processImage, targetSize: targetSize, outType: outType, EXT: EXT };
})(typeof self !== 'undefined' ? self : this);
