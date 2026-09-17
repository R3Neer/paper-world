const {chromium}=require('@playwright/test');

const baseUrl=process.env.DEMO_URL||'http://127.0.0.1:5186/';
const assert=(condition,message)=>{if(!condition)throw new Error(message);};

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:478,height:974}});
 try{
  await page.goto(baseUrl);await page.evaluate(()=>localStorage.clear());await page.reload();await page.evaluate(()=>document.fonts.ready);
  await page.getByRole('button',{name:'CHANGE',exact:true}).click();
  await page.getByRole('button',{name:'Change Madrid',exact:true}).click();
  await page.locator('#app.choosing').waitFor();
  assert(await page.locator('.city-choice').count()===30,'The normal clock catalog must contain all 30 clocks.');
  assert(await page.locator('#app.infinite-catalog').count()===1,'The normal clock catalog must wrap.');
  const centerDistance=id=>page.evaluate(id=>{const a=document.querySelector('#catalog').getBoundingClientRect(),b=document.querySelector(`[data-city="${id}"]`).getBoundingClientRect();return Math.hypot((a.left+a.width/2)-(b.left+b.width/2),(a.top+a.height/2)-(b.top+b.height/2));},id);
  const centered=await centerDistance(0);
  assert(centered<15,`The current clock was not centered (${centered.toFixed(1)} px).`);
  await page.locator('#catalog').evaluate(el=>{el.scrollLeft=el.scrollWidth;el.scrollTop=el.scrollHeight;el.dispatchEvent(new Event('scroll'));});await page.waitForTimeout(80);
  const wrapped=await page.locator('#catalog').evaluate(el=>({left:el.scrollLeft,top:el.scrollTop,width:el.scrollWidth-el.clientWidth,height:el.scrollHeight-el.clientHeight}));
  assert(wrapped.left>0&&wrapped.left<wrapped.width,'Horizontal wrapping failed.');assert(wrapped.top>0&&wrapped.top<wrapped.height,'Vertical wrapping failed.');
  await page.getByRole('searchbox').fill('AL');await page.waitForTimeout(80);
  assert(await page.locator('.city-choice').count()===0,'City search must not match country-name fragments.');
  await page.getByRole('searchbox').fill('RO');await page.waitForTimeout(80);
  assert(await page.locator('#app.infinite-catalog').count()===0,'Search results must be finite.');
  const matches=await page.locator('.city-choice').count();assert(matches>1&&matches<30,`Search did not rebuild a compact result matrix (${matches}).`);
  assert(await centerDistance(9)<15,'The geographically nearest search result must remain centered.');
  await page.getByRole('button',{name:'Clear search'}).click();await page.waitForTimeout(80);
  assert(await page.locator('.city-choice').count()===30&&await page.locator('#app.infinite-catalog').count()===1,'Clearing search must restore the wrapped clock matrix.');
  await page.locator('[data-city="4"]').click();await page.waitForTimeout(750);
  assert(await page.getByRole('button',{name:'Change Paris',exact:true}).count()===1,'Selecting an occupied clock did not move it to the selected slot.');
  assert(await page.getByRole('button',{name:'Change Madrid',exact:true}).count()===1,'Selecting an occupied clock did not swap the displaced clock back into its old slot.');
  await page.getByRole('button',{name:'Change 00:30',exact:true}).click();await page.locator('#app.choosing').waitFor();
  assert(await page.locator('.city-choice').count()===25,'The normal timer catalog must contain the fixed 5 by 5 matrix.');
  assert(await page.locator('#app.infinite-catalog').count()===1,'The normal timer catalog must wrap.');
  const timerCentered=await centerDistance(34);
  assert(timerCentered<15,`The current timer was not centered (${timerCentered.toFixed(1)} px).`);
  await page.getByRole('searchbox').fill(':1');await page.waitForTimeout(80);
  assert(await page.locator('#app.infinite-catalog').count()===0,'Timer search results must be finite.');
  assert(await centerDistance(32)<15,'The temporally nearest timer search result must remain centered.');
  await page.getByRole('button',{name:'Back to the nine blocks'}).click();await page.waitForTimeout(650);
  await page.getByRole('button',{name:'BACK',exact:true}).click();await page.waitForTimeout(120);
  const timerEditor=page.getByRole('button',{name:'Edit remaining time timer in position 1'}),editorBox=await timerEditor.boundingBox();assert(editorBox&&await timerEditor.isVisible(),'An idle timer must expose its duration editor.');
  await page.getByRole('button',{name:'Start timer in position 1'}).click();await page.waitForTimeout(450);
  assert(!await timerEditor.isVisible(),'A running timer must not intercept its face with the duration editor.');
  await page.mouse.click(editorBox.x+editorBox.width/2,editorBox.y+editorBox.height/2);await page.waitForTimeout(750);
  assert(await page.getByRole('button',{name:'Main clock: 00:30',exact:true}).count()===1,'The inactive edit zone must behave like a generic block tap.');
  console.log('Checks passed: wrapped catalogs, city-only search focus, clock swapping, and timer edit routing.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
