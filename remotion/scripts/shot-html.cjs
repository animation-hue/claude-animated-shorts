const { chromium } = require('playwright');
(async () => { const [html, out] = process.argv.slice(2); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 800 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('PAGEERR', e.message)); await p.goto('file://' + html); await p.waitForFunction('window.done === true', null, { timeout: 30000 });
  await p.screenshot({ path: out, fullPage: true }); await b.close(); })();
