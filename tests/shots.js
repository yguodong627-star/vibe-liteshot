const puppeteer = require('puppeteer-core'), { execSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lss-'));
  execSync(`python3 -c "
from PIL import Image, ImageDraw
import random
for i in range(8):
    im=Image.new('RGB',(1200,900),(random.randint(60,230),random.randint(60,230),random.randint(60,230)))
    d=ImageDraw.Draw(im); d.ellipse((300,200,900,700),fill=(255,255,255)); im.save('${dir}/商品%02d.jpg'%(i+1),quality=95)
"`);
  const files = fs.readdirSync(dir).map(f => path.join(dir, f));
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--lang=zh-CN'] });
  const URL_ = process.env.URL || 'http://localhost:8766/index.html';
  for (const [w, h, m, pre] of [[1280, 800, false, 'desktop'], [390, 844, true, 'mobile']]) {
    const p = await (await b.createBrowserContext()).newPage();
    await p.setViewport({ width: w, height: h, isMobile: m, deviceScaleFactor: 1 });
    await p.goto(URL_, { waitUntil: 'networkidle0' });
    await p.screenshot({ path: `screenshots/${pre}-1-empty.png` });
    await (await p.$('#fileIn')).uploadFile(...files);
    await new Promise(r => setTimeout(r, 800)); await p.click('#runBtn');
    await p.waitForFunction(() => !document.querySelector('#zipBtn').disabled, { timeout: 60000 });
    await p.screenshot({ path: `screenshots/${pre}-2-done.png` });
    await p.evaluate(() => { const d = document.querySelector('#presetBox'); d.open = true; d.scrollIntoView(); });
    await p.type('#presetName', '淘宝主图'); await p.click('#savePreset'); await new Promise(r => setTimeout(r, 300));
    await p.screenshot({ path: `screenshots/${pre}-3-presets.png` });
  }
  await b.close(); fs.rmSync(dir, { recursive: true });
})();
