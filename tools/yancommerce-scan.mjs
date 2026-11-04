import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const startUrl = process.env.YANCOMMERCE_URL || 'https://app.yancommerce.com/ventes/devis?onboarding=quick-devis-v1';
const stateBase64 = process.env.YANCOMMERCE_STORAGE_STATE_BASE64;
if (stateBase64) {
  await fs.writeFile('/tmp/yancommerce-state.json', Buffer.from(stateBase64, 'base64'));
}
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(stateBase64 ? { storageState: '/tmp/yancommerce-state.json' } : {});
const page = await context.newPage();
const seen = new Set();
const queue = [startUrl];
const report = [];
await fs.mkdir('yancommerce-scan', { recursive: true });

while (queue.length && seen.size < 35) {
  const url = queue.shift();
  if (seen.has(url)) continue;
  seen.add(url);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1500);
    const data = await page.evaluate(() => ({
      title: document.title,
      url: location.href,
      headings: [...document.querySelectorAll('h1,h2,h3,[role=heading]')].map(x => x.innerText.trim()).filter(Boolean).slice(0, 60),
      links: [...document.querySelectorAll('a[href]')].map(a => ({ text: a.innerText.trim(), href: a.href })).filter(a => a.text || a.href).slice(0, 150),
      buttons: [...document.querySelectorAll('button,[role=button]')].map(x => x.innerText.trim() || x.getAttribute('aria-label') || '').filter(Boolean).slice(0, 100),
      text: document.body?.innerText?.slice(0, 12000) || ''
    }));
    report.push(data);
    const shot = 'yancommerce-scan/page-' + String(report.length).padStart(2, '0') + '.png';
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    for (const link of data.links) {
      try {
        const u = new URL(link.href);
        const base = new URL(startUrl);
        if (u.origin === base.origin && !seen.has(u.href) && queue.length < 60) queue.push(u.href);
      } catch {}
    }
    if (/login|sign.?in|connexion|تسجيل الدخول/i.test(data.title + ' ' + data.text.slice(0, 1500))) {
      report.push({ note: 'Login page or authentication wall detected. Provide an authorized browser storage-state file through the repository secret YANCOMMERCE_STORAGE_STATE_BASE64 to scan private pages.' });
      break;
    }
  } catch (e) {
    report.push({ url, error: String(e) });
  }
}
await fs.writeFile('yancommerce-scan/report.json', JSON.stringify({ startUrl, pagesVisited: seen.size, pages: report }, null, 2));
await browser.close();
