/* 压片 LiteShot · 界面与流程。纯前端，不联网。 */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };

  /* ---------- 平台预设（note 标注核对状态） ---------- */
  var PRESETS = [
    { id: 'none', name: '不改尺寸（仅压缩 / 水印 / 改名）', mode: 'none', w: 1600, h: 1600, note: '' },
    { id: 'sq1600', name: '正方形补白 1600×1600', mode: 'pad', w: 1600, h: 1600, note: '通用方图：等比缩放后居中，四周补白。补白颜色可改。' },
    { id: 'sq1000', name: '正方形补白 1000×1000', mode: 'pad', w: 1000, h: 1000, note: '通用方图（小尺寸）。' },
    { id: 'tb11', name: '淘宝/天猫 主图 1:1  1440×1440', mode: 'pad', w: 1440, h: 1440, note: '✓ 已核对：淘宝商家公告/行业资料称 1:1 主图推荐 1440×1440 及以上（早期的 800×800 已不是当前推荐）。要铺满不留白，把处理方式改成“居中裁切”。' },
    { id: 'tb34', name: '淘宝/天猫 主图 3:4  1440×1920', mode: 'pad', w: 1440, h: 1920, note: '✓ 已核对：3:4 主图推荐 1440×1920 及以上。类目要求以商家后台为准。' },
    { id: 'tbdetail', name: '淘宝 详情页图 宽 750（高不限）', mode: 'fit', w: 750, h: 2000, note: '△ 部分核对：公开资料写详情图宽度应在 620–1500px、单张高度不超过 2000px、≤3MB。750 是常用宽度，非官方唯一值，请自行核对；可配合“体积上限 3000KB”。' },
    { id: 'amz', name: 'Amazon 主图 长边 1600', mode: 'fit', w: 1600, h: 1600, note: '✓ 已核对：长边 ≥1000px 才能启用放大镜，1600+ 更佳；不要人为放大小图。白底（RGB 255）、商品占画面 ≥85%、无文字/Logo，这些需要你自己把关，本工具不检测。' },
    { id: 'amzsq', name: 'Amazon 白底方图 2000×2000', mode: 'pad', w: 2000, h: 2000, note: '△ 方形画布是行业常见做法，并非 Amazon 硬性要求；补白为纯白 #FFFFFF。' },
    { id: 'shop', name: 'Shopify 方图 2048×2048', mode: 'pad', w: 2048, h: 2048, note: '✓ 已核对：Shopify 官方博客建议方形商品图 2048×2048，上传上限 5000×5000 / 20MB。' },
    { id: 'etsy', name: 'Etsy 列表图 2000×1500（4:3 横图）', mode: 'cover', w: 2000, h: 1500, note: '✓ 已核对：Etsy 建议列表图宽高均 ≥2000px、首图 ≥635px、首图用横图或方图；透明 PNG 在 Etsy 会显示成黑色，建议输出 JPG，勿选透明。△ 4:3 比例 Etsy 帮助页未写明，自行核对。注意：该预设为居中裁切，边缘会被裁掉。' },
    { id: 'etsysq', name: 'Etsy 方图补白 2000×2000', mode: 'pad', w: 2000, h: 2000, note: '✓ 已核对尺寸：宽高 ≥2000px。Etsy 官方更建议横图，方图仅作备用。上传超过 1MB 在慢网下可能失败，可设“体积上限 1000KB”。' },
    { id: 'custom', name: '自定义', mode: 'pad', w: 1200, h: 1200, note: '在下方自行设定处理方式与宽高。' }
  ];
  var POS = [['br', '右下'], ['bl', '左下'], ['tr', '右上'], ['tl', '左上'], ['mc', '正中'], ['bc', '下中'], ['tc', '上中'], ['ml', '左中'], ['mr', '右中']];
  /* 注意：place() 里 position 码为 行(t/m/b)+列(l/c/r)，这里 UI 值需对应 */
  var POS_CODE = { br: 'br', bl: 'bl', tr: 'tr', tl: 'tl', mc: 'mc', bc: 'bc', tc: 'tc', ml: 'ml', mr: 'mr' };

  var presetSel = $('#preset');
  PRESETS.forEach(function (p) { var o = document.createElement('option'); o.value = p.id; o.textContent = p.name; presetSel.appendChild(o); });
  ['#textPos', '#imgPos'].forEach(function (s) {
    POS.forEach(function (p) { var o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; $(s).appendChild(o); });
  });
  presetSel.value = 'sq1600'; applyPreset('sq1600');

  function applyPreset(id) {
    var p = PRESETS.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    $('#mode').value = p.mode; $('#w').value = p.w; $('#h').value = p.h;
    $('#presetNote').textContent = p.note;
    $('#presetNote').className = 'hint' + (p.note.indexOf('△') >= 0 ? ' warn' : '');
    $('#bg').value = '#ffffff'; $('#transparent').checked = false;
    syncDisabled();
  }
  presetSel.addEventListener('change', function () { applyPreset(presetSel.value); changed(); });
  ['#mode', '#w', '#h'].forEach(function (s) {
    $(s).addEventListener('input', function () { presetSel.value = 'custom'; $('#presetNote').textContent = PRESETS[PRESETS.length - 1].note; $('#presetNote').className = 'hint'; syncDisabled(); });
  });
  function syncDisabled() {
    var m = $('#mode').value;
    $('#w').disabled = $('#h').disabled = m === 'none';
    $('#bg').disabled = $('#transparent').disabled = m !== 'pad';
    $('#noUpscale').disabled = m === 'none' || m === 'cover';
    $('#textSet').classList.toggle('off', !$('#textOn').checked);
    $('#imgSet').classList.toggle('off', !$('#imgOn').checked);
  }

  /* ---------- 状态 ---------- */
  var items = [], seq = 0, logoBlob = null, logoUrl = '';
  var running = false, hasResults = false, selId = null;

  function fmt(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(msg, ms) {
    var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t);
    toast.t = setTimeout(function () { t.hidden = true; }, ms || 3200);
  }

  /* ---------- 设置读写 ---------- */
  function readAll() {
    var o = {};
    document.querySelectorAll('[data-k]').forEach(function (el) {
      o[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return o;
  }
  function applyAll(o) {
    document.querySelectorAll('[data-k]').forEach(function (el) {
      if (!(el.dataset.k in o)) return;
      if (el.type === 'checkbox') el.checked = !!o[el.dataset.k]; else el.value = o[el.dataset.k];
    });
    syncDisabled(); labels(); changed();
  }
  function opts() {
    var s = readAll();
    return {
      mode: s.mode, w: +s.w || 1, h: +s.h || 1, noUpscale: s.noUpscale, bg: s.bg, transparent: s.transparent,
      format: s.format, quality: Math.min(1, Math.max(0.3, (+s.quality) / 100)), maxKB: Math.max(0, +s.maxKB || 0),
      wm: {
        textOn: s.textOn, text: s.text, textSize: +s.textSize, textOpacity: +s.textOpacity, textPos: s.textPos, textColor: s.textColor, tile: s.tile,
        imgOn: s.imgOn && !!logoBlob, imgScale: +s.imgScale, imgOpacity: +s.imgOpacity, imgPos: s.imgPos
      }
    };
  }
  function labels() {
    $('#qv').textContent = $('#quality').value; $('#tsv').textContent = $('#textSize').value;
    $('#tov').textContent = $('#textOpacity').value; $('#isv').textContent = $('#imgScale').value;
    $('#iov').textContent = $('#imgOpacity').value;
    var f = $('#format').value, png = f === 'png';
    $('#quality').disabled = png; $('#maxKB').disabled = png;
    renamePreview();
  }

  /* ---------- 重命名 ---------- */
  function pad(n, d) { n = String(n); while (n.length < d) n = '0' + n; return n; }
  function today() { var d = new Date(); return d.getFullYear() + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2); }
  function baseName(name) { var i = name.lastIndexOf('.'); return i > 0 ? name.slice(0, i) : name; }
  function clean(s) { return s.replace(/[\\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '').trim(); }
  function makeName(tpl, it, idx, w, h, ext, start, digits) {
    var s = (tpl || '{name}').replace(/\{name\}/g, baseName(it.name)).replace(/\{n\}/g, pad(start + idx, digits))
      .replace(/\{w\}/g, w).replace(/\{h\}/g, h).replace(/\{date\}/g, today());
    s = clean(s) || ('image' + pad(start + idx, digits));
    return s + '.' + ext;
  }
  function extFor(it) {
    var f = $('#format').value;
    if (f === 'jpeg') return 'jpg'; if (f === 'webp') return 'webp'; if (f === 'png') return 'png';
    var t = (it.file.type || '').toLowerCase();
    return t === 'image/jpeg' ? 'jpg' : t === 'image/webp' ? 'webp' : 'png';
  }
  function allNames(useResult) {
    var tpl = $('#tpl').value, st = Math.max(0, +$('#start').value || 0), dg = Math.min(6, Math.max(1, +$('#digits').value || 1));
    var used = {}, out = [];
    items.forEach(function (it, i) {
      var w = it.res ? it.res.w : it.w, h = it.res ? it.res.h : it.h;
      if (!useResult || !it.res) { var t = LS.targetSize(opts(), it.w, it.h); w = t.W; h = t.H; }
      var nm = makeName(tpl, it, i, w, h, extFor(it), st, dg), base = nm, k = 2;
      while (used[nm.toLowerCase()]) { var j = base.lastIndexOf('.'); nm = base.slice(0, j) + '-' + k++ + base.slice(j); }
      used[nm.toLowerCase()] = 1; out.push(nm);
    });
    return out;
  }
  function renamePreview() {
    var el = $('#renamePv');
    if (!items.length) {
      var fake = { name: 'IMG_0412.JPG', file: { type: 'image/jpeg' } };
      var e = extFor(fake);
      el.textContent = '示例：' + [0, 1].map(function (i) { return makeName($('#tpl').value, fake, i, 1600, 1600, e, +$('#start').value || 0, +$('#digits').value || 1); }).join('，');
      return;
    }
    var n = allNames(false);
    el.textContent = '预览：' + n.slice(0, 3).join('，') + (n.length > 3 ? ' …' : '');
  }
  $('#chips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var t = $('#tpl'), s = t.selectionStart == null ? t.value.length : t.selectionStart;
    t.value = t.value.slice(0, s) + b.dataset.ins + t.value.slice(t.selectionEnd == null ? s : t.selectionEnd);
    t.focus(); changed();
  });

  /* ---------- 处理池（Web Worker，失败自动退回主线程分批） ---------- */
  var pool = (function () {
    var N = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)), workers = [], idle = [], queue = [], pending = {}, uid = 0, useMain = false;
    try {
      if (typeof OffscreenCanvas === 'undefined' || typeof Worker === 'undefined') throw 0;
      for (var i = 0; i < N; i++) {
        var w = new Worker('worker.js'); w.onmessage = onmsg(w); w.onerror = onerr(w);
        workers.push(w); idle.push(w);
      }
    } catch (e) { useMain = true; workers = []; idle = []; }
    function onmsg(w) {
      return function (e) {
        var d = e.data, p = pending[d.id]; delete pending[d.id]; idle.push(w); pump();
        if (!p) return; d.ok ? p.res(d.res) : p.rej(new Error(d.err));
      };
    }
    function onerr(w) {
      return function () { // Worker 不可用：整体退回主线程
        useMain = true; workers.forEach(function (x) { x.terminate(); }); workers = []; idle = [];
        var ps = pending; pending = {};
        Object.keys(ps).forEach(function (k) { ps[k].job && queue.push(ps[k].job); });
        pump();
      };
    }
    var mainBusy = false;
    function pump() {
      if (useMain) {
        if (mainBusy) return; var job = queue.shift(); if (!job) return; mainBusy = true;
        setTimeout(function () {
          LS.processImage(job.file, job.opts, job.logo).then(job.p.res, job.p.rej).then(function () { mainBusy = false; pump(); });
        }, 0);
        return;
      }
      while (idle.length && queue.length) {
        var w = idle.shift(), j = queue.shift(), id = ++uid;
        pending[id] = j.p; j.p.job = j;
        w.postMessage({ id: id, file: j.file, opts: j.opts, logo: j.logo });
      }
    }
    return {
      mode: function () { return useMain ? '主线程分批' : 'Web Worker ×' + workers.length; },
      run: function (file, o, logo) {
        return new Promise(function (res, rej) { queue.push({ file: file, opts: o, logo: logo, p: { res: res, rej: rej } }); pump(); });
      }
    };
  })();

  /* ---------- 添加文件 ---------- */
  var IMG_RE = /\.(jpe?g|png|webp|gif|bmp|avif)$/i;
  function isImg(f) { return /^image\/(jpeg|png|webp|gif|bmp|avif)$/.test(f.type) || (!f.type && IMG_RE.test(f.name)); }

  async function addFiles(list) {
    var arr = Array.prototype.slice.call(list).filter(function (f) { return f.file ? isImg(f.file) : isImg(f); });
    var skipped = 0, added = 0;
    for (var k = 0; k < arr.length; k++) {
      var f = arr[k], rel = '';
      if (f.file) { rel = f.rel; f = f.file; } else rel = f.webkitRelativePath || '';
      if (items.some(function (x) { return x.file.name === f.name && x.file.size === f.size && x.file.lastModified === f.lastModified && x.rel === rel; })) { skipped++; continue; }
      var it = { id: ++seq, file: f, name: f.name, rel: rel, size: f.size, w: 0, h: 0, thumb: '', res: null, st: 'ready' };
      items.push(it); added++;
    }
    if (skipped) toast('已跳过 ' + skipped + ' 张重复图片');
    if (!arr.length && list.length) toast('没有找到可处理的图片（支持 JPG / PNG / WebP / GIF / BMP）');
    invalidate(); renderList(); updateBar();
    if (!selId && items.length) select(items[0].id);
    // 生成缩略图 + 读尺寸
    for (var i = 0; i < items.length; i++) if (!items[i].thumb) await thumbOf(items[i]);
    renderList(); renamePreview(); schedulePreview();
  }
  function thumbOf(it) {
    return new Promise(function (res) {
      var u = URL.createObjectURL(it.file), im = new Image();
      im.onload = function () {
        it.w = im.naturalWidth; it.h = im.naturalHeight;
        var s = 96 / Math.max(it.w, it.h), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(it.w * s)); c.height = Math.max(1, Math.round(it.h * s));
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        it.thumb = c.toDataURL('image/jpeg', 0.7); URL.revokeObjectURL(u); res();
      };
      im.onerror = function () { it.st = 'error'; it.err = '无法读取'; it.thumb = 'x'; URL.revokeObjectURL(u); res(); };
      im.src = u;
    });
  }
  function readDir(entry, base, out) {
    return new Promise(function (resolve) {
      if (entry.isFile) { entry.file(function (f) { out.push({ file: f, rel: base + f.name }); resolve(); }, function () { resolve(); }); return; }
      var rd = entry.createReader(), all = [];
      (function more() {
        rd.readEntries(async function (es) {
          if (!es.length) {
            for (var i = 0; i < all.length; i++) await readDir(all[i], base + entry.name + '/', out);
            return resolve();
          }
          all = all.concat(Array.prototype.slice.call(es)); more();
        }, function () { resolve(); });
      })();
    });
  }
  async function handleDrop(dt) {
    var out = [], ents = [];
    if (dt.items && dt.items.length && dt.items[0].webkitGetAsEntry) {
      for (var i = 0; i < dt.items.length; i++) { var e = dt.items[i].webkitGetAsEntry(); if (e) ents.push(e); }
      for (var j = 0; j < ents.length; j++) await readDir(ents[j], '', out);
      addFiles(out);
    } else addFiles(dt.files);
  }

  var drop = $('#drop');
  ['dragenter', 'dragover'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); if (ev === 'drop' || e.target === document.documentElement || !e.relatedTarget) drop.classList.remove('over'); }); });
  document.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer) handleDrop(e.dataTransfer); });
  $('#pickFiles').onclick = function (e) { e.stopPropagation(); $('#fileIn').click(); };
  $('#pickDir').onclick = function (e) { e.stopPropagation(); $('#dirIn').click(); };
  drop.addEventListener('click', function () { $('#fileIn').click(); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#fileIn').click(); } });
  $('#fileIn').onchange = function () { addFiles(this.files); this.value = ''; };
  $('#dirIn').onchange = function () { addFiles(this.files); this.value = ''; };
  $('#clearBtn').onclick = function () { items = []; selId = null; invalidate(); renderList(); updateBar(); schedulePreview(); renamePreview(); };

  /* ---------- 列表渲染 ---------- */
  function renderList() {
    var has = items.length > 0;
    $('#listCard').hidden = !has; $('#emptyHelp').hidden = has; drop.classList.toggle('compact', has);
    $('#cnt').textContent = has ? items.length + ' 张' : '';
    var names = hasResults ? allNames(true) : null;
    $('#files').innerHTML = items.map(function (it, i) {
      var meta = it.w ? it.w + '×' + it.h + ' · ' + fmt(it.size) : fmt(it.size);
      var right = '';
      if (it.st === 'working') right = '<span class="st work">处理中</span>';
      else if (it.st === 'error') right = '<span class="st bad">' + esc(it.err || '失败') + '</span>';
      else if (it.res) {
        var d = Math.round((1 - it.res.blob.size / it.size) * 100);
        right = '<span class="st ok">' + fmt(it.res.blob.size) + '</span><span class="dlt ' + (d >= 0 ? 'down' : 'up') + '">' + (d >= 0 ? '−' + d : '+' + (-d)) + '%</span>';
      }
      return '<li class="' + (it.id === selId ? 'sel' : '') + '" data-id="' + it.id + '">' +
        '<div class="th">' + (it.thumb && it.thumb !== 'x' ? '<img alt="" src="' + it.thumb + '">' : '') + '</div>' +
        '<div class="nm"><b title="' + esc(it.rel || it.name) + '">' + esc(names ? names[i] : (it.rel || it.name)) + '</b><span>' + meta + (names && it.rel !== '' ? '' : '') + '</span></div>' +
        '<div class="rt">' + right + '</div><button type="button" class="rm" aria-label="移除" data-rm="' + it.id + '">×</button></li>';
    }).join('');
  }
  $('#files').addEventListener('click', function (e) {
    var rm = e.target.closest('[data-rm]');
    if (rm) {
      var id = +rm.dataset.rm; items = items.filter(function (x) { return x.id !== id; });
      if (selId === id) selId = items[0] ? items[0].id : null;
      invalidate(); renderList(); updateBar(); renamePreview(); schedulePreview(); return;
    }
    var li = e.target.closest('li'); if (li) select(+li.dataset.id);
  });
  function select(id) { selId = id; renderList(); schedulePreview(); }

  /* ---------- 预览 ---------- */
  var pvTimer = 0, pvTok = 0, pvUrlA = '', pvUrlB = '';
  function schedulePreview() { clearTimeout(pvTimer); pvTimer = setTimeout(runPreview, 220); }
  async function runPreview() {
    var it = items.filter(function (x) { return x.id === selId; })[0];
    $('#previewCard').hidden = !it; if (!it) return;
    var tok = ++pvTok;
    $('#pvName').textContent = it.rel || it.name;
    if (pvUrlA) URL.revokeObjectURL(pvUrlA); pvUrlA = URL.createObjectURL(it.file); $('#pvA').src = pvUrlA;
    $('#pvAcap').textContent = '原图 · ' + (it.w ? it.w + '×' + it.h + ' · ' : '') + fmt(it.size);
    $('#pvBusy').hidden = false;
    try {
      var r = await pool.run(it.file, opts(), logoBlob);
      if (tok !== pvTok) return;
      if (pvUrlB) URL.revokeObjectURL(pvUrlB); pvUrlB = URL.createObjectURL(r.blob); $('#pvB').src = pvUrlB;
      var d = Math.round((1 - r.blob.size / it.size) * 100);
      $('#pvBcap').textContent = '处理后 · ' + r.w + '×' + r.h + ' · ' + fmt(r.blob.size);
      $('#pvStat').innerHTML = '<b class="' + (d >= 0 ? 'down' : 'up') + '">' + (d >= 0 ? '省 ' + d : '增 ' + (-d)) + '%</b>' + (r.capMiss ? ' <span class="bad">未达体积上限</span>' : '');
    } catch (e) { if (tok === pvTok) { $('#pvBcap').textContent = '预览失败：' + e.message; } }
    if (tok === pvTok) $('#pvBusy').hidden = true;
  }

  /* ---------- 批处理 ---------- */
  function invalidate() { hasResults = false; items.forEach(function (it) { it.res = null; if (it.st !== 'error') it.st = 'ready'; }); $('#prog').hidden = true; }
  function changed() { if (hasResults || items.some(function (i) { return i.res; })) { invalidate(); renderList(); } updateBar(); renamePreview(); schedulePreview(); }

  var runBtn = $('#runBtn'), zipBtn = $('#zipBtn');
  runBtn.onclick = async function () {
    if (running || !items.length) return;
    running = true; invalidate(); updateBar();
    var o = opts(), done = 0, total = items.filter(function (i) { return i.st !== 'error'; }).length, t0 = performance.now();
    $('#prog').hidden = false; $('#progI').style.width = '0%';
    items.forEach(function (it) { if (it.st !== 'error') it.st = 'working'; });
    renderList();
    await Promise.all(items.filter(function (i) { return i.st === 'working'; }).map(function (it) {
      return pool.run(it.file, o, logoBlob).then(function (r) { it.res = r; it.st = 'done'; }, function (e) { it.st = 'error'; it.err = '处理失败'; })
        .then(function () { done++; $('#progI').style.width = (done / total * 100) + '%'; $('#sum').textContent = '处理中 ' + done + ' / ' + total; if (done % 4 === 0) renderList(); });
    }));
    running = false; hasResults = items.some(function (i) { return i.res; });
    renderList(); updateBar();
    var sec = ((performance.now() - t0) / 1000).toFixed(1);
    toast('处理完成 · 用时 ' + sec + ' 秒（' + pool.mode() + '）');
    window.__lastRunMs = performance.now() - t0;
  };
  zipBtn.onclick = async function () {
    var ok = items.filter(function (i) { return i.res; }); if (!ok.length) return;
    zipBtn.disabled = true; var old = zipBtn.textContent; zipBtn.textContent = '打包中…';
    try {
      var names = allNames(true), zip = new JSZip(), idx = 0;
      items.forEach(function (it, i) { if (it.res) { zip.file(names[i], it.res.blob, { binary: true }); idx++; } });
      var blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'liteshot-' + today() + '-' + idx + '张.zip'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 20000);
      toast('已打包 ' + idx + ' 张');
    } catch (e) { toast('打包失败：' + e.message); }
    zipBtn.textContent = old; updateBar();
  };

  function updateBar() {
    var n = items.length, sum = $('#sum');
    runBtn.disabled = running || !n; zipBtn.disabled = running || !hasResults;
    runBtn.textContent = running ? '处理中…' : (hasResults ? '重新处理' : '开始处理');
    if (running) return;
    if (!n) { sum.textContent = '还没有图片'; return; }
    var orig = items.reduce(function (a, b) { return a + b.size; }, 0);
    if (hasResults) {
      var okI = items.filter(function (i) { return i.res; });
      var o2 = okI.reduce(function (a, b) { return a + b.size; }, 0), nw = okI.reduce(function (a, b) { return a + b.res.blob.size; }, 0);
      var d = Math.round((1 - nw / o2) * 100);
      sum.innerHTML = okI.length + ' 张完成 · ' + fmt(o2) + ' → <b>' + fmt(nw) + '</b> <em class="' + (d >= 0 ? 'down' : 'up') + '">' + (d >= 0 ? '−' + d : '+' + (-d)) + '%</em>';
    } else sum.textContent = n + ' 张待处理 · 合计 ' + fmt(orig);
  }

  /* ---------- 水印 Logo ---------- */
  $('#pickLogo').onclick = function () { $('#logoIn').click(); };
  $('#logoIn').onchange = function () {
    var f = this.files[0]; this.value = ''; if (!f) return;
    logoBlob = f; $('#logoName').textContent = f.name; if (logoUrl) URL.revokeObjectURL(logoUrl);
    logoUrl = URL.createObjectURL(f); $('#logoThumb').src = logoUrl; $('#logoThumb').hidden = false;
    $('#imgOn').checked = true; syncDisabled(); changed();
  };
  $('#imgOn').addEventListener('change', function () { if (this.checked && !logoBlob) toast('请先选择 Logo 图片'); });

  /* ---------- 我的预设 ---------- */
  function getMy() { try { return JSON.parse(localStorage.getItem('liteshot.presets') || '[]'); } catch (e) { return []; } }
  function setMy(a) { try { localStorage.setItem('liteshot.presets', JSON.stringify(a)); } catch (e) { toast('无法写入本机存储'); } }
  function renderMyPresets() {
    var a = getMy();
    $('#myPresets').innerHTML = a.length ? a.map(function (p, i) {
      return '<li><button type="button" class="use" data-use="' + i + '">' + esc(p.name) + '</button><button type="button" class="rm" data-del="' + i + '" aria-label="删除">×</button></li>';
    }).join('') : '<li class="muted">还没有保存的预设</li>';
  }
  $('#savePreset').onclick = function () {
    var n = $('#presetName').value.trim(); if (!n) return toast('先给预设起个名字');
    var a = getMy().filter(function (p) { return p.name !== n; }); a.push({ name: n, s: readAll() });
    setMy(a); $('#presetName').value = ''; renderMyPresets(); toast('已保存预设“' + n + '”');
  };
  $('#presetBox').addEventListener('click', function (e) {
    if (e.target.closest('summary')) return;
    var u = e.target.closest('[data-use]'), d = e.target.closest('[data-del]');
    var a = getMy();
    if (u) { var p = a[+u.dataset.use]; if (p) { applyAll(p.s); toast('已套用“' + p.name + '”'); } }
    if (d) { a.splice(+d.dataset.del, 1); setMy(a); renderMyPresets(); }
  });
  /* ---------- 绑定 ---------- */
  document.querySelectorAll('[data-k]').forEach(function (el) {
    if (el.id === 'preset') return;
    el.addEventListener('input', function () { syncDisabled(); labels(); changed(); });
    el.addEventListener('change', function () { syncDisabled(); labels(); changed(); });
  });
  syncDisabled(); labels(); renderMyPresets(); renderList(); updateBar(); renamePreview();
  window.__ls = { pool: pool, items: function () { return items; } };
})();
