const {chromium}=require('@playwright/test');
const fs=require('fs');

const baseUrl=process.env.DEMO_URL||'http://127.0.0.1:5186/';
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const rgb=async page=>page.locator('#app').evaluate(el=>getComputedStyle(el).backgroundColor);
const screen=async page=>page.locator('.device-canvas').evaluate(el=>getComputedStyle(el).getPropertyValue('--dc-screen-background').trim());

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1264,height:710}});
 try{
  fs.mkdirSync('artifacts',{recursive:true});
  await page.goto(baseUrl);await page.evaluate(()=>localStorage.clear());await page.reload();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);
  const viewport=await page.evaluate(()=>{const screen=document.querySelector('.dc-screen').getBoundingClientRect(),content=document.querySelector('.dc-content').getBoundingClientRect();return{top:Math.abs(screen.top-content.top),height:Math.abs(screen.height-content.height)}});
  assert(viewport.top<.5&&viewport.height<.5,`The framed app must fill the complete device screen (${viewport.top.toFixed(1)} px top gap, ${viewport.height.toFixed(1)} px height gap).`);
  assert(await rgb(page)==='rgb(64, 83, 168)','Normal mode must keep the blue world background.');
  await page.screenshot({path:'artifacts/feedback-normal.png'});

  await page.getByRole('button',{name:'CHANGE',exact:true}).click();await page.waitForTimeout(500);
  assert(await rgb(page)==='rgb(182, 150, 63)','CHANGE must use the warm yellow world background.');
  assert(await screen(page)==='#b6963f','The device screen must follow the yellow CHANGE context.');
  const target=page.getByRole('button',{name:'Change 00:30',exact:true});await target.hover();
  const widths=[];for(let i=0;i<7;i++){widths.push((await target.boundingBox()).width);await page.waitForTimeout(310);}
  const depthRange=Math.max(...widths)-Math.min(...widths);assert(depthRange>.12,`Hover stopped the continuous depth motion (${depthRange.toFixed(3)} px).`);
  await page.screenshot({path:'artifacts/feedback-change.png'});

  await page.getByRole('button',{name:'BACK',exact:true}).click();await page.waitForTimeout(850);
  const editor=page.getByRole('button',{name:'Edit remaining time timer in position 1'});await editor.hover();await page.waitForTimeout(260);
  await page.screenshot({path:'artifacts/feedback-timer-hover.png'});
  const box=await editor.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(110);
  await page.screenshot({path:'artifacts/feedback-timer-press.png'});await page.mouse.up();

  await page.reload();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);
  await page.getByRole('button',{name:'Make main: Paris',exact:true}).dblclick();await page.locator('#app.choosing').waitFor();await page.waitForTimeout(420);
  assert(await rgb(page)==='rgb(182, 150, 63)','A direct double-click selector must also use the yellow replacement context.');
  assert(await screen(page)==='#b6963f','The device screen must remain yellow in a direct selector.');
  const selectorUnderlay=await page.locator('#app').evaluate(el=>getComputedStyle(el,'::before').backgroundColor);
  assert(selectorUnderlay!=='rgb(183, 172, 208)','The selector must not restore the obsolete blue-purple underlay.');
  const selectorLayout=await page.evaluate(()=>{const rect=selector=>document.querySelector(selector).getBoundingClientRect(),app=rect('#app'),heading=rect('.selector-heading'),modes=rect('#mode-nav'),search=rect('#search-form');return{headingLeft:heading.left-app.left,headingRight:app.right-heading.right,modesTop:modes.top-app.top,modesBottom:app.bottom-modes.bottom,searchBottom:app.bottom-search.bottom,gap:modes.left-search.right,half:app.height/2};});
  assert(selectorLayout.headingLeft<15&&selectorLayout.headingRight<15,'The destination card must occupy the complete upper width.');
  assert(selectorLayout.modesTop>selectorLayout.half&&Math.abs(selectorLayout.modesBottom-selectorLayout.searchBottom)<1&&selectorLayout.gap>=8,'Category navigation must sit beside the search card in the lower-right corner.');
  const search=page.getByRole('searchbox');await search.focus();const searchOutline=await search.evaluate(el=>getComputedStyle(el).outlineWidth);assert(searchOutline==='0px','The recessed search field must not draw a separate focus rectangle.');await page.screenshot({path:'artifacts/feedback-search-focus.png'});
  console.log(`Checks passed: full-screen scene, selector layout, context colors, direct-selector color, and hover-preserved depth motion (${depthRange.toFixed(3)} px).`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
