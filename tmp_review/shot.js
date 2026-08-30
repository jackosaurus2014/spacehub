const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('https://spacenexus.us/this-page-does-not-exist-xyz', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: 'tmp_review/404-390.png', fullPage: true });
  const info = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('a,button')].find(el => el.textContent.includes('Return to Mission Control'));
    const rect = btn ? btn.getBoundingClientRect() : null;
    const elAtPoint = rect ? document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2) : null;
    return {
      bodyHeight: document.body.scrollHeight,
      btnRect: rect ? {top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right} : null,
      elAtPointTag: elAtPoint ? elAtPoint.outerHTML.slice(0,200) : null,
      isBtnItself: elAtPoint === btn,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
