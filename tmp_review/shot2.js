const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('https://spacenexus.us/this-page-does-not-exist-xyz', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise(r => setTimeout(r, 3000));
  const info = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('a,button')].find(el => el.textContent.includes('Return to Mission Control'));
    btn.scrollIntoView({block: 'center'});
  });
  await new Promise(r => setTimeout(r, 500));
  const info2 = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('a,button')].find(el => el.textContent.includes('Return to Mission Control'));
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const elAtPoint = document.elementFromPoint(cx, cy);
    // check all fixed-position elements overlapping viewport bottom
    const fixedEls = [...document.querySelectorAll('*')].filter(el => {
      const s = getComputedStyle(el);
      return s.position === 'fixed' && el.getBoundingClientRect().height > 0;
    }).map(el => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, cls: el.className.toString().slice(0,80), rect: {top:r.top,bottom:r.bottom,left:r.left,right:r.right}, z: getComputedStyle(el).zIndex };
    });
    return {
      viewportH: window.innerHeight,
      btnRect: {top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right},
      elAtPointIsBtn: elAtPoint === btn || btn.contains(elAtPoint),
      elAtPointHTML: elAtPoint ? elAtPoint.outerHTML.slice(0,150) : null,
      fixedEls,
    };
  });
  console.log(JSON.stringify(info2, null, 2));
  await page.screenshot({ path: 'tmp_review/404-390-scrolled.png' });
  await browser.close();
})();
