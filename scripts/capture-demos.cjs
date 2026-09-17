const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const frameRoot=path.join(root,'artifacts','demo-frames');
const frameMs=83;
const baseUrl=process.env.DEMO_URL||'http://127.0.0.1:5186/';

function resetDir(dir){fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});}

async function prepare(page){
 await page.goto(baseUrl);
 await page.evaluate(()=>localStorage.clear());
 await page.reload();
 await page.evaluate(()=>document.fonts.ready);
 await page.addStyleTag({content:`
  html,body{width:478px!important;height:974px!important;overflow:hidden!important}
  .device-canvas{--dc-zoom:1!important;width:478px!important;min-width:478px!important;height:974px!important;min-height:974px!important;padding:28px 20px 30px!important;align-items:flex-start!important}
  .dc-stage{--dc-zoom:1!important}
  .dc-zoom-controls{display:none!important}
  #demo-touch{position:fixed;z-index:10000;width:28px;height:28px;border-radius:50%;background:#6f6a84;border:3px solid #f2e2cc;box-shadow:0 0 0 3px #2b2742,inset 3px 3px #aaa5ba,inset -3px -3px #3a3749;pointer-events:none;opacity:0;transform:translate(-50%,-50%) scale(.3)}
  #demo-touch.hit{animation:demo-touch 415ms cubic-bezier(.18,.75,.25,1)}
  @keyframes demo-touch{0%{opacity:0;transform:translate(-50%,-50%) scale(1.35)}20%,68%{opacity:1;transform:translate(-50%,-50%) scale(.88)}100%{opacity:0;transform:translate(-50%,-50%) scale(.35)}}
 `});
 await page.evaluate(()=>{const marker=document.createElement('i');marker.id='demo-touch';document.body.append(marker)});
}

async function record(name,sequence){
 const dir=path.join(frameRoot,name);resetDir(dir);
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:478,height:974},deviceScaleFactor:1});
 let number=0;
 const frame=()=>page.screenshot({path:path.join(dir,`${String(number++).padStart(4,'0')}.png`)});
 const hold=async ms=>{
  const count=Math.max(1,Math.round(ms/frameMs));
  for(let i=0;i<count;i++){
   const started=Date.now();await frame();
   await page.waitForTimeout(Math.max(0,frameMs-(Date.now()-started)));
  }
 };
 const mark=async(locator,position)=>{
  const box=await locator.boundingBox();if(!box)throw new Error('Target is not visible');
  const x=box.x+(position?.x??box.width/2),y=box.y+(position?.y??box.height/2);
  await page.evaluate(({x,y})=>{const marker=document.querySelector('#demo-touch');marker.classList.remove('hit');void marker.offsetWidth;marker.style.left=`${x}px`;marker.style.top=`${y}px`;marker.classList.add('hit')},{x,y});
 };
 const tap=async(locator,after=500,position)=>{await mark(locator,position);await locator.click(position?{position}:undefined);await hold(after)};
 const type=async text=>{for(const key of text){await page.keyboard.press(key);await hold(frameMs)}};
 const drag=async(locator,dx,dy,duration=664)=>{
  const box=await locator.boundingBox();if(!box)throw new Error('Drag surface is not visible');
  const from={x:box.x+box.width*.58,y:box.y+box.height*.55},steps=Math.max(6,Math.round(duration/frameMs));
  await page.mouse.move(from.x,from.y);await page.mouse.down();
  for(let i=1;i<=steps;i++){const t=i/steps,eased=t*t*(3-2*t);await page.mouse.move(from.x+dx*eased,from.y+dy*eased);await hold(frameMs)}
  await page.mouse.up();await hold(332);
 };
 try{await prepare(page);await sequence({page,hold,tap,type,drag});}
 finally{await browser.close()}
 console.log(`${name}: ${number} frames (${(number*frameMs/1000).toFixed(1)} s)`);
}

async function spatialWorld({page,hold,tap,type,drag}){
 await hold(1494);
 await tap(page.getByRole('button',{name:'Make main: Tokyo'}),1411);
 await tap(page.getByRole('button',{name:'CHANGE',exact:true}),1245);
 await tap(page.getByRole('button',{name:'Change London',exact:true}),1079);
 await hold(747);
 await drag(page.locator('#catalog'),-115,-90,747);
 const search=page.getByRole('searchbox',{name:'Search a city or country'});
 await tap(search,415);await type('ROME');await hold(830);
 await tap(page.getByRole('button',{name:'Rome, Italy',exact:true}),1245);
 await tap(page.getByRole('button',{name:'BACK',exact:true}),1079);
 await hold(1494);
}

async function instruments({page,hold,tap,type,drag}){
 await hold(1245);
 await tap(page.getByRole('button',{name:'CHANGE',exact:true}),1079);
 await tap(page.getByRole('button',{name:'Change Seoul',exact:true}),830);
 await tap(page.getByRole('button',{name:'Move down to TIMERS'}),1162);
 await drag(page.locator('#catalog'),-95,-70,581);
 await tap(page.getByRole('button',{name:'CUSTOM TIMER, Timer',exact:true}),747);
 const duration=page.getByRole('textbox',{name:'Timer minutes and seconds'});
 await duration.press('ControlOrMeta+A');await type('0010');await duration.press('Enter');await hold(1245);
 await tap(page.getByRole('button',{name:'Change Buenos Aires',exact:true}),830);
 await tap(page.getByRole('button',{name:'Move up to CHRONO'}),1079);
 await tap(page.getByRole('button',{name:'CHRONO, Stopwatch',exact:true}),1245);
 await tap(page.getByRole('button',{name:'BACK',exact:true}),996);
 await tap(page.getByRole('button',{name:'Start timer in position 9'}),498);
 await hold(2075);
 await tap(page.getByRole('button',{name:'Pause timer in position 9'}),1162);
 await tap(page.getByRole('button',{name:'Continue timer in position 9'}),830);
 await hold(1079);
 await tap(page.getByRole('button',{name:'Pause timer in position 9'}),996);
 await tap(page.getByRole('button',{name:'Reset timer in position 9'}),1162);
 await tap(page.getByRole('button',{name:'Start chrono in position 8'}),498);
 await hold(1494);
 await tap(page.getByRole('button',{name:'Pause chrono in position 8'}),1079);
 await tap(page.getByRole('button',{name:'Reset chrono in position 8'}),996);
 await tap(page.getByRole('button',{name:'Make main: CHRONO'}),1411);
 await hold(1328);
}

(async()=>{
 const requested=process.argv[2];
 if(!requested)resetDir(frameRoot);
 if(!requested||requested==='01-spatial-world')await record('01-spatial-world',spatialWorld);
 if(!requested||requested==='02-timers-and-chrono')await record('02-timers-and-chrono',instruments);
})().catch(error=>{console.error(error);process.exit(1)});
