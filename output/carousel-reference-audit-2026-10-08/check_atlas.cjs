const { chromium } = require('C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1100}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(__dirname,'atlas.html')).href);
    if(await page.locator('article').count()!==76)throw new Error('Missing source cards');
    await page.locator('article img').first().evaluate(img=>img.decode());
    await page.screenshot({path:path.join(__dirname,'atlas-desktop.png')});
    await page.selectOption('#group',{label:'Kobey case and system'});
    if(await page.locator('article:visible').count()!==8)throw new Error('Group filter failed');
    await page.fill('#query','topology');
    if(await page.locator('article:visible').count()!==1)throw new Error('Text filter failed');
    await page.fill('#query','');await page.selectOption('#group','');
    await page.setViewportSize({width:390,height:844});
    const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
    if(!fits)throw new Error('Mobile overflow');
    await page.screenshot({path:path.join(__dirname,'atlas-mobile.png')});
    await page.locator('#K1-4').scrollIntoViewIfNeeded();
    await page.locator('#K1-4 img').evaluate(img=>img.decode());
    await page.locator('#K1-4').screenshot({path:path.join(__dirname,'atlas-mobile-card.png')});
    const size=await page.locator('#K1-4 img').evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight}));
    if(!size.width||!size.height)throw new Error('Original not decoded');
    const allOriginalLinks=await page.locator('article a.source').evaluateAll(links=>links.every(a=>!a.href.includes('#')&&a.href.startsWith('file:')));
    if(!allOriginalLinks)throw new Error('Source URL encoding failed');
    if(errors.length)throw new Error(errors.join('\n'));
    const result={cards:76,group_filter:8,text_filter:1,mobile_no_overflow:fits,original_decoded:size,source_links_encoded:true,page_errors:errors};
    fs.writeFileSync(path.join(__dirname,'atlas-verification.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
