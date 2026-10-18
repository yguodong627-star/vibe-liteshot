// 自测：node tests/smoke.js（需 puppeteer-core、本机 Chrome、python3 的 Pillow 生成测试图）
// 先在项目根目录 python3 -m http.server 8766 &，或设置 URL
const puppeteer = require('puppeteer-core'), { execSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const URL_ = process.env.URL || 'http://localhost:8766/index.html';
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ FAIL: ') + m); if (!c) fail++; };
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-'));
  execSync(`python3 -c "
from PIL import Image
import random
for i in range(45):
    im=Image.new('RGB',(900+i,700),(i*5%255,120,200)); im.save('${dir}/p%02d.png'%i)
# 一张较大的噪声图（约 6MB+，原免费版曾限 5MB 以内的场景）
im=Image.frombytes('RGB',(2000,1500),random.randbytes(2000*1500*3)); im.save('${dir}/big.png')
"`);
  const files = fs.readdirSync(dir).map(f => path.join(dir, f));
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  const html0 = await p.evaluate(() => document.documentElement.outerHTML);
  ok(!/Pro\b|授权码|付费|收费|解锁|升级/.test(html0), '页面不含 Pro/授权码/付费/解锁字样');
  ok(!(await p.$('#proModal')) && !(await p.$('#proBtn')) && !(await p.$('#licIn')), '没有 Pro 弹窗/按钮/授权码输入框');
  ok(html0.includes('完全免费'), '页面标明完全免费');
  const inp = await p.$('#fileIn'); await inp.uploadFile(...files);
  await p.waitForFunction(() => window.__ls.items().length >= 46, { timeout: 20000 }).catch(() => {});
  const n = await p.evaluate(() => window.__ls.items().length);
  ok(n === 46, '一次导入 46 张（含大图）全部加入，无张数限制，实际 ' + n);
  ok(!/\/ 20/.test(await p.$eval('#cnt', e => e.textContent)), '计数不再显示 “/ 20”');
  await p.click('#runBtn');
  await p.waitForFunction(() => !document.querySelector('#zipBtn').disabled, { timeout: 120000 });
  const done = await p.evaluate(() => window.__ls.items().filter(i => i.res).length);
  ok(done === 46, '46 张全部处理完成，实际 ' + done);
  // 预设：原 Pro 功能，现可直接保存与套用
  await p.evaluate(() => { document.querySelector('#presetBox').open = true; });
  await p.type('#presetName', '测试预设'); await p.click('#savePreset');
  ok((await p.$$('#myPresets .use')).length === 1, '无需解锁即可保存预设');
  await p.select('#preset', 'none');
  await p.click('#myPresets .use');
  ok(await p.evaluate(() => localStorage.getItem('liteshot.presets').includes('测试预设')), '预设写入本机');
  await p.click('#myPresets .rm');
  ok((await p.$$('#myPresets .use')).length === 0, '预设可删除');
  await p.click('#zipBtn');
  ok(errs.length === 0, '无脚本错误 ' + errs.join(';'));
  await b.close(); fs.rmSync(dir, { recursive: true });
  console.log(fail ? '失败 ' + fail : '全部通过'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
