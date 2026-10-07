const { chromium } = require('C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1100}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(__dirname,'atlas.html')).href);
    await page.locator('article img').first().evaluate(img=>img.decode());
    if(await page.locator('article').count()!==57)throw new Error('Expected 57 source cards');
    await page.screenshot({path:path.join(__dirname,'atlas-desktop.png')});
    await page.selectOption('#group',{label:'Niksetting: sequence 2'});
    if(await page.locator('article:visible').count()!==5)throw new Error('Sequence filter failed');
    await page.fill('#query','arithmetic');
    if(await page.locator('article:visible').count()!==1)throw new Error('Text filter failed');
    await page.fill('#query','');
    await page.selectOption('#group','');
    await page.setViewportSize({width:390,height:844});
    const fits = await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth);
    if(!fits)throw new Error('Mobile horizontal overflow');
    await page.screenshot({path:path.join(__dirname,'atlas-mobile.png')});
    await page.locator('#N2-2').scrollIntoViewIfNeeded();
    await page.locator('#N2-2 img').evaluate(img=>img.decode());
    const imageSize=await page.locator('#N2-2 img').evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight}));
    if(!imageSize.width)throw new Error('Original image failed to decode');
    await page.locator('#N2-2').screenshot({path:path.join(__dirname,'atlas-mobile-card.png')});
    if(errors.length)throw new Error(errors.join('\n'));
    const result={cards:57,sequence_filter:5,text_filter:1,mobile_no_overflow:fits,original_decoded:imageSize,page_errors:errors};
    fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
