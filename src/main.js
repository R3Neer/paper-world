import * as THREE from 'three';
import {instrumentFactory} from './instruments.js';
import opentype from 'opentype.js';
import fontBytes from '../assets/Bangers-Regular.ttf';
const engravingFont=opentype.parse(fontBytes.buffer);

const $=s=>document.querySelector(s);
const app=$('#app'),host=$('#scene');
const screenBlue='#4053a8',screenChange='#b6963f';
window.clockDeviceCanvas=DeviceCanvas.mount(app,{theme:{background:'#526a81',screen:screenBlue,zoomSurface:'#f2e2cc',zoomButton:'#e97868',zoomText:'#2b2742',zoomButtonText:'#2b2742',zoomBorder:'#2b2742',zoomShadow:'#2b2742',zoomRadius:'8px',zoomButtonRadius:'4px'}});
const cityData=[
 ['Madrid','Spain','Europe/Madrid'],['New York','United States','America/New_York'],['Tokyo','Japan','Asia/Tokyo'],['London','United Kingdom','Europe/London'],['Paris','France','Europe/Paris'],['Sydney','Australia','Australia/Sydney'],['Mexico City','Mexico','America/Mexico_City'],['Buenos Aires','Argentina','America/Argentina/Buenos_Aires'],['Seoul','South Korea','Asia/Seoul'],['Rome','Italy','Europe/Rome'],['Berlin','Germany','Europe/Berlin'],['Lisbon','Portugal','Europe/Lisbon'],['Los Angeles','United States','America/Los_Angeles'],['Bogota','Colombia','America/Bogota'],['Lima','Peru','America/Lima'],['Santiago','Chile','America/Santiago'],['Sao Paulo','Brazil','America/Sao_Paulo'],['Cairo','Egypt','Africa/Cairo'],['Nairobi','Kenya','Africa/Nairobi'],['Dubai','United Arab Emirates','Asia/Dubai'],['Singapore','Singapore','Asia/Singapore'],['Bangkok','Thailand','Asia/Bangkok'],['New Delhi','India','Asia/Kolkata'],['Hong Kong','China','Asia/Hong_Kong'],['Honolulu','United States','Pacific/Honolulu'],['Auckland','New Zealand','Pacific/Auckland'],['Reykjavik','Iceland','Atlantic/Reykjavik'],['Istanbul','Turkey','Europe/Istanbul'],['Vancouver','Canada','America/Vancouver'],['Toronto','Canada','America/Toronto']
];
const colors=['#f4cb68','#e97868','#65bfb7','#9888cd','#9dcead','#eea6b5','#7db8d6','#d9a775','#b2be70','#cb8daf','#8fbab1','#b9a2dc'];
const coordinates=[[40.4,-3.7],[40.7,-74],[35.7,139.7],[51.5,-.1],[48.9,2.4],[-33.9,151.2],[19.4,-99.1],[-34.6,-58.4],[37.6,127],[41.9,12.5],[52.5,13.4],[38.7,-9.1],[34.1,-118.2],[4.7,-74.1],[-12,-77],[-33.4,-70.7],[-23.6,-46.6],[30,31.2],[-1.3,36.8],[25.2,55.3],[1.3,103.8],[13.8,100.5],[28.6,77.2],[22.3,114.2],[21.3,-157.9],[-36.8,174.8],[64.1,-21.9],[41,29],[49.3,-123.1],[43.7,-79.4]];
const finishUniform={value:1};
const cities=cityData.map(([name,country,zone],i)=>({id:i,name,country,zone,color:colors[i%colors.length],fmt:new Intl.DateTimeFormat('en-GB',{timeZone:zone,hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'}),offset:new Intl.DateTimeFormat('en',{timeZone:zone,timeZoneName:'shortOffset'})}));
const durations=[5,10,15,20,30,45,60,90,120,180,240,300,null,450,600,900,1200,1500,1800,2400,2700,3600,4500,5400,5999];
const timerItems=durations.map((seconds,i)=>({id:30+i,name:seconds===null?'CUSTOM TIMER':formatDuration(seconds),country:'Timer',kind:'timer',total:seconds??0,custom:seconds===null,color:'#ede4d3'}));
const chronoItem={id:55,name:'CHRONO',country:'Stopwatch',kind:'chrono',color:'#373748'};
cities.push(...timerItems,chronoItem);
let catalogMode='clocks',returnToEdit=false,catalogTravel=null,idleBlendStart=0;
const storageKey='papel-world-v2';
const timerId=seconds=>timerItems.find(item=>item.total===seconds&&!item.custom).id;
let slots=[timerId(30),timerId(300),timerId(1500),4,0,5,6,chronoItem.id,8];
try{const saved=JSON.parse(localStorage.getItem(storageKey));if(Array.isArray(saved)&&saved.length===9){const restored=saved.map(value=>{if(typeof value==='number')return value;if(value&&value.kind==='timer'&&Number.isFinite(value.total)){const total=Math.min(5999,Math.max(0,Math.round(value.total))),preset=timerItems.find(c=>c.total===total&&!c.custom);if(preset)return preset.id;const item={id:cities.length,name:formatDuration(total),country:'Timer',kind:'timer',total,color:'#ede4d3'};cities.push(item);return item.id;}if(value?.kind==='chrono')return chronoItem.id;return -1;});if(restored.every(id=>Number.isInteger(id)&&cities[id]))slots=restored;}}catch{}
let editing=false,selectedSlot=null,busy=false,transition=null,lastTap=null,view='home',w=402,h=802,selectorStart=0,selectorClosing=false,editPulse=null,mainPulse=null,viewChange=null,homeEntry=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const announce=text=>{$('#announcement').textContent=text;};
function save(){try{localStorage.setItem(storageKey,JSON.stringify(slots.map(id=>cities[id].kind?{kind:cities[id].kind,total:cities[id].total}:id)));}catch{}}
function normalize(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
const ink=new THREE.Color('#2b2742'),cream=new THREE.Color('#f2e2cc'),timerHoverBlue=new THREE.Color('#bce9e4');
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{host.innerHTML='<p class="render-error">Unable to start the 3D scene. Enable browser graphics acceleration and reload.</p>';throw new Error('WebGL unavailable');}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(renderer.domElement);
const scene=new THREE.Scene(),catalogScene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(42,1,.1,120);camera.position.set(0,0,16);
const catalogCamera=new THREE.PerspectiveCamera(42,1,.1,200);
const catalogWarmTarget=new THREE.WebGLRenderTarget(2,2,{depthBuffer:true});
const catalogUnit=64,cellWidth=194,cellHeight=224;
let catalogColumns=5,panGesture=null,panVelocity={x:0,y:0},catalogWrap=null,catalogScrollAdjusting=false,catalogFocusId=null;
// Four hard light bands plus screen-space print marks. The marks follow light,
// rather than behaving like a texture pasted uniformly over every material.
function mat(color,comic=1){
 const pigment=new THREE.Color(color);const m=new THREE.ShaderMaterial({uniforms:{pigment:{value:pigment},comic:{value:comic},finish:finishUniform},vertexShader:`varying vec3 surfaceNormal;varying vec3 localPoint;varying vec3 localNormal;
 void main(){localPoint=position;localNormal=normal;surfaceNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:`uniform vec3 pigment;uniform float comic;uniform float finish;varying vec3 surfaceNormal;varying vec3 localPoint;varying vec3 localNormal;
 float hash(float n){return fract(sin(n*127.1)*43758.5453);}
 float dots(vec2 p,float spacing,float radius){vec2 q=fract((p+vec2(1.7,3.1))/spacing)-.5;return 1.0-smoothstep(radius,radius+.08,length(q));}
 float lineMask(vec2 p,float angle,float spacing,float weight){vec2 d=vec2(cos(angle),sin(angle));float stripe=abs(fract(dot(p,d)/spacing)-.5);return 1.0-smoothstep(weight,weight+.07,stripe);}
 void main(){vec3 n=normalize(surfaceNormal);float light=dot(n,normalize(vec3(-0.55,0.75,1.0)));float band=light<-.08?.30:light<.30?.52:light<.68?.78:1.04;
 band=max(band,.48);vec3 shaded=pigment*band;vec3 ink=mix(pigment*.32,vec3(.19,.15,.25),.58);vec2 px=gl_FragCoord.xy;
 float deep=1.0-smoothstep(-.12,.16,light);float middle=1.0-smoothstep(.25,.58,light);float bright=smoothstep(.80,.98,light);
 float hatch=lineMask(px,.72,8.0,.075);float cross=lineMask(px,-.72,9.0,.065);float shadowInk=max(hatch*middle,deep*max(hatch,cross));
 float midDots=dots(px,7.0,mix(.12,.30,clamp((.58-light)/.46,0.0,1.0)))*(1.0-deep)*middle;
 float glowDots=dots(px,11.0,.13)*bright;
 vec3 an=abs(localNormal);vec2 surface=an.z>.5?localPoint.xy:vec2(an.x>.5?localPoint.y:localPoint.x,localPoint.z);
 vec2 paper=surface*34.0;float tooth=hash(floor(paper.x)*51.0+floor(paper.y))-.5;
 float printDots=dots(surface*65.0,6.0,.23);float front=step(.5,an.z);
 float stripeId=floor(surface.x*3.5),section=floor((surface.y+hash(stripeId)*8.0)/11.0);float seed=hash(stripeId*17.0+section*41.0);
 float strokeWidth=mix(.035,.075,seed);float stripe=1.0-smoothstep(strokeWidth,strokeWidth+.015,abs(fract(surface.x*3.5)-.5));
 float segment=fract((surface.y+hash(stripeId)*8.0)/11.0);float stroke=stripe*step(.08,segment)*step(segment,mix(.40,.94,hash(seed*93.0)))*step(.76,seed)*(1.0-front);
 // A side stroke that reaches the front edge turns briefly over it instead of
 // ending on a hard seam. Its tangential seed matches the adjacent wall, while
 // a second hash varies how far each individual ink mark wraps onto the face.
 float wrapStroke=0.0;
 if(front>.5&&finish>.5&&finish<1.5){
  vec2 edgeGap=vec2(1.035,1.260)-abs(localPoint.xy);float useX=step(edgeGap.x,edgeGap.y);
  float tangent=mix(localPoint.x,localPoint.y,useX),distanceToEdge=mix(edgeGap.y,edgeGap.x,useX);
  float wrapId=floor(tangent*3.5),wrapSeed=hash(wrapId*17.0),edgeSegment=fract((.035+hash(wrapId)*8.0)/11.0);
  float wrapWidth=mix(.035,.075,wrapSeed),wrapLine=1.0-smoothstep(wrapWidth,wrapWidth+.015,abs(fract(tangent*3.5)-.5));
  float reachesEdge=step(.08,edgeSegment)*step(edgeSegment,mix(.40,.94,hash(wrapSeed*93.0)))*step(.76,wrapSeed);
  float wrapLength=mix(.035,.115,hash(wrapSeed*137.0+wrapId*11.0));
  wrapStroke=wrapLine*reachesEdge*step(0.0,distanceToEdge)*(1.0-smoothstep(wrapLength*.72,wrapLength,distanceToEdge));
 }
 float printWeight=finish<.5?1.0:finish<1.5?.40:.82;float strokeWeight=finish<.5?.22:finish<1.5?1.0:.80;
 float marks=shadowInk*.72*printWeight;
 float mark=clamp(marks*min(comic,1.0)+max(stroke,wrapStroke)*.85*strokeWeight,0.0,.88);
 if(comic>1.5)mark=printDots*.38;
 if(dot(pigment,vec3(.333))<.24)ink=vec3(.63,.63,.73);
 shaded=mix(shaded,ink,mark);shaded*=1.0+tooth*.065;
 gl_FragColor=vec4(shaded,1.0);
 #include <colorspace_fragment>
 }`});m.color=pigment;return m;
}
function box(parent,x,y,z,sx,sy,sz,material){const g=new THREE.BoxGeometry(sx,sy,sz),m=new THREE.Mesh(g,material);m.position.set(x,y,z);parent.add(m);return m;}
function bevelOutline(width,height,cut=0){const x=width/2,y=height/2;return [[-x+cut,-y],[x-cut,-y],[x,-y+cut],[x,y-cut],[x-cut,y],[-x+cut,y],[-x,y-cut],[-x,-y+cut]];}
function bevelRing(parent,outer,inner,outerZ,innerZ,material,offsetY=0){
 const vertices=[];for(let i=0;i<8;i++){const j=(i+1)%8,a=[...outer[i],outerZ],b=[...outer[j],outerZ],c=[...inner[j],innerZ],d=[...inner[i],innerZ];vertices.push(...a,...b,...c,...a,...c,...d);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.position.y=offsetY;parent.add(mesh);
}
function bevelBody(parent,length,material){const outline=bevelOutline(2.07,2.52,.08),shape=new THREE.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false,steps:1});const sideGroups=geometry.groups.filter(g=>g.materialIndex===1);geometry.clearGroups();sideGroups.forEach(g=>geometry.addGroup(g.start,g.count,0));const mesh=new THREE.Mesh(geometry,[material]);mesh.position.z=.035-length;parent.add(mesh);}
function gmtLabel(parent,city){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const label=new THREE.Mesh(new THREE.PlaneGeometry(.48,.16),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));label.position.set(.59,-.47,.15);parent.add(label);
 let previous='';return now=>{const text=city.offset.formatToParts(now).find(p=>p.type==='timeZoneName').value;if(text===previous)return;previous=text;ctx.clearRect(0,0,256,96);ctx.font='bold 64px Arial';ctx.fillStyle='#625769';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,48,250);texture.needsUpdate=true;};
}
function clockSurface(parent,city,material){
 const path=new opentype.Path(),glyphPaths=[];let pen=0;for(const char of city.name.toUpperCase()){if(char===' '){pen+=22;continue;}const glyph=engravingFont.charToGlyph(char),bb=glyph.getPath(0,0,100).getBoundingBox(),gp=glyph.getPath(pen-bb.x1,0,100);glyphPaths.push(gp);path.extend(gp);pen+=bb.x2-bb.x1+5;}const bounds=path.getBoundingBox(),scale=Math.min(1.77/(bounds.x2-bounds.x1),.32/(bounds.y2-bounds.y1));
 const X=x=>(x-(bounds.x1+bounds.x2)/2)*scale*.91,Y=y=>-(y-(bounds.y1+bounds.y2)/2)*scale*.95;
 const letters=[];for(const gp of glyphPaths){const outlines=new THREE.ShapePath();for(const c of gp.commands){if(c.type==='M')outlines.moveTo(X(c.x),Y(c.y)-1.005);else if(c.type==='L')outlines.lineTo(X(c.x),Y(c.y)-1.005);else if(c.type==='Q')outlines.quadraticCurveTo(X(c.x1),Y(c.y1)-1.005,X(c.x),Y(c.y)-1.005);else if(c.type==='C')outlines.bezierCurveTo(X(c.x1),Y(c.y1)-1.005,X(c.x2),Y(c.y2)-1.005,X(c.x),Y(c.y)-1.005);else if(c.type==='Z')outlines.currentPath.closePath();}letters.push(...outlines.toShapes(false));}const surface=new THREE.Shape();bevelOutline(1.95,2.40,.035).forEach(([x,y],i)=>i?surface.lineTo(x,y):surface.moveTo(x,y));surface.closePath();
 const aperture=new THREE.Path();aperture.moveTo(-.885,-.645);aperture.lineTo(-.885,1.125);aperture.lineTo(.885,1.125);aperture.lineTo(.885,-.645);aperture.closePath();surface.holes.push(aperture);
 const islands=[];for(const letter of letters){surface.holes.push(new THREE.Path(letter.getPoints(8)));for(const hole of letter.holes)islands.push(new THREE.Shape(hole.getPoints(8)));}
 const geometry=new THREE.ExtrudeGeometry([surface,...islands],{depth:.15,bevelEnabled:false,curveSegments:8,steps:1});const mesh=new THREE.Mesh(geometry,material);mesh.position.z=-.015;parent.add(mesh);
 // This is the bottom of the carved letter cavities. The surrounding band is flush.
 const floorColor=new THREE.Color(city.color).multiplyScalar(.28);box(parent,0,-1.005,.082,1.93,.39,.008,mat(floorColor,.55));
}
function diamondHand(parent,length,tail,width,z,material){
 // A narrow raised inset creates a bevel before the central ridge.
 const corners=[[-width,0,z],[0,-tail,z],[width,0,z],[0,length,z]],inner=corners.map(([x,y])=>[x*.74,y*.94,z+.022]),ridge=[0,0,z+.095];
 const positions=[];for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4],c=inner[(i+1)%4],d=inner[i];positions.push(...a,...b,...c,...a,...c,...d,...d,...c,...ridge);positions.push(...a,...[a[0],a[1],z-.025],...[b[0],b[1],z-.025],...a,...[b[0],b[1],z-.025],...b);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();const hand=new THREE.Mesh(geometry,material);parent.add(hand);return hand;
}
function makeClock(city,{tunnel=false}={}){
 if(city.kind)return makeInstrument(city,tunnel);
 const root=new THREE.Group(),face=new THREE.Group();root.add(face);root.userData={city,face,materials:[],hours:null,minutes:null,seconds:null};
 const base=mat(city.color,1),side=mat(city.color,1),dark=mat('#726781',.18),dial=mat('#f2e2cc',2),ticks=mat('#969084',.12),accent=mat(city.color,.55);
 root.userData.materials=[base,side,dial,ticks,accent];root.userData.materials.forEach(m=>{m.userData.base=m.color.clone();});
 const prismDepth=tunnel?27.335:.335;root.userData.pivotDepth=prismDepth;bevelBody(root,prismDepth,side);
 bevelRing(face,bevelOutline(2.07,2.52,.08),bevelOutline(1.95,2.40,.035),.035,.135,base);
 box(face,0,.24,.0,1.61,1.61,.016,dial);
 const dialBevel=mat('#dcc8a9',.08);root.userData.materials.push(dialBevel);dialBevel.userData.base=dialBevel.color.clone();
 bevelRing(face,bevelOutline(1.77,1.77,0),bevelOutline(1.61,1.61,0),.136,.008,dialBevel,.24);
 clockSurface(face,city,base);
 root.userData.updateGmt=gmtLabel(face,city);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;let x=Math.sin(a),y=Math.cos(a);const t=.73/Math.max(Math.abs(x),Math.abs(y));const marker=box(face,x*t,.23+y*t,.041,.022,i%3===0?.13:.082,.025,ticks);marker.rotation.z=-a;}
 const hourPivot=new THREE.Group(),minutePivot=new THREE.Group(),secondPivot=new THREE.Group();for(const g of [hourPivot,minutePivot,secondPivot]){g.position.set(0,.23,.13);face.add(g);}
 diamondHand(hourPivot,.51,.13,.074,0,dark);
 diamondHand(minutePivot,.73,.17,.045,.056,dark);
 diamondHand(secondPivot,.78,.20,.012,.12,accent);
 const pinProfile=[new THREE.Vector2(.052,-.06),new THREE.Vector2(.073,-.036),new THREE.Vector2(.073,.034),new THREE.Vector2(.053,.06)];const pin=new THREE.Mesh(new THREE.LatheGeometry(pinProfile,20),base);pin.rotation.x=Math.PI/2;pin.position.set(0,.23,.24);face.add(pin);
 root.userData.hours=hourPivot;root.userData.minutes=minutePivot;root.userData.seconds=secondPivot;
 return root;
}
const homes=[],targets=[];let choices=[];
const placements=[[-2.04,4.0,-1], [0,4.27,-1.5], [2.04,4.0,-1],[-2.12,.02,-1.1],[0,.15,4],[2.12,.02,-1.1],[-2.04,-4.0,-1],[0,-4.27,-1.5],[2.04,-4.0,-1]];
function clearGroup(g){g.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});g.removeFromParent();}
function buildHome(){homes.forEach(clearGroup);homes.length=0;$('#clock-targets').replaceChildren();targets.length=0;
 slots.forEach((id,i)=>{const city=cities[id],g=makeClock(city,{tunnel:true}),p=placements[i];g.position.set(...p);g.scale.setScalar(i===4?1.14:.80);scene.add(g);homes.push(g);
  const b=document.createElement('button');b.className='clock-target';b.dataset.slot=i;b.addEventListener('click',e=>tap(i,e));b.addEventListener('dblclick',()=>openSelector(i,true));b.addEventListener('focus',()=>g.userData.hovered=true);b.addEventListener('blur',()=>g.userData.hovered=false);$('#clock-targets').append(b);targets.push(b);
 });updateLabels();installHomeControls();}
function updateLabels(){targets.forEach((b,i)=>{b.setAttribute('aria-label',`${editing?'Change':i===4?'Main clock:':'Make main:'} ${cities[slots[i]].name}`);b.setAttribute('aria-pressed',String(i===4));});app.classList.toggle('editing',editing);$('.edit-toolbar').setAttribute('aria-hidden',String(!editing));$('#edit').disabled=editing;$('#edit-back').disabled=!editing;}
function tap(i,e){if(view!=='home')return;if(editing){openSelector(i);return;}if(e.detail===0){promote(i);return;}const now=performance.now();if(lastTap&&lastTap.i===i&&now-lastTap.at<330){lastTap=null;openSelector(i,true);return;}lastTap={i,at:now};promote(i);}
function promote(i){if(busy)return;if(i===4){mainPulse={start:performance.now(),duration:reduced.matches?0:240};announce(`${cities[slots[i]].name}, main clock.`);return;}busy=true;announce(`${cities[slots[i]].name}, new main clock.`);transition={start:performance.now(),duration:reduced.matches?0:560,index:i};}
function setEdit(next){editing=next;window.clockDeviceCanvas.setTheme({screen:editing?screenChange:screenBlue});if(mainPulse){homes[4].scale.setScalar(1.14);mainPulse=null;}editPulse={start:performance.now(),duration:reduced.matches?0:680};updateLabels();if(editing)scheduleCatalogWarm();announce(editing?'Change mode. Select a block to replace it.':'Change mode closed.');}
$('#edit').addEventListener('click',()=>{if(!busy&&!editing)setEdit(true);});
$('#edit-back').addEventListener('click',()=>{if(!busy&&editing)setEdit(false);});
function cancelSwap(){if(!transition)return;homes.forEach((g,i)=>{g.position.set(...placements[i]);g.scale.setScalar(i===4?1.14:.80);});transition=null;busy=false;}
function resetHomes(){homes.forEach((g,i)=>{g.position.set(...placements[i]);g.scale.setScalar(i===4?1.14:.80);g.rotation.set(0,0,0);g.userData.face.rotation.set(0,0,0);});}
function openSelector(i,fromDouble=false){if(view!=='home'||viewChange)return;cancelSwap();lastTap=null;if(mainPulse){homes[4].scale.setScalar(1.14);mainPulse=null;}returnToEdit=editing&&!fromDouble;window.clockDeviceCanvas.setTheme({screen:screenChange});catalogMode=cities[slots[i]].kind==='timer'?'timer':'clocks';if(choices.some(c=>(c.mesh.userData.city.kind??'clocks')!==catalogMode)){choices.forEach(c=>clearGroup(c.mesh));choices=[];}updateModeNav();editPulse=null;selectedSlot=i;busy=true;$('#replace-name').textContent=cities[slots[i]].name;$('#selector').hidden=false;app.classList.add('preparing-selector');$('#search').value='';if(choices.length){fitCatalogViewport();centerCatalog(i);}else{buildCatalog(true,i);warmCatalogGpu();}viewChange={start:performance.now(),duration:reduced.matches?0:260};announce(`Opening the selector to replace ${cities[slots[i]].name}.`);}
function enterSelector(now){resetHomes();viewChange=null;view='selector';selectorStart=now;selectorClosing=false;window.clockDeviceCanvas.setTheme({screen:screenChange});app.classList.remove('preparing-selector');app.classList.add('choosing');$('#close-selector').focus({preventScroll:true});centerCatalog(selectedSlot);announce(`Choose ${catalogMode==='timer'?'a timer':'a city'} to replace ${cities[slots[selectedSlot]].name}.`);}
function deferClear(groups){const work=()=>groups.forEach(clearGroup);if('requestIdleCallback'in window)requestIdleCallback(work,{timeout:900});else setTimeout(work,500);}
function finishSelectorClose(now=performance.now()){view='home';editing=returnToEdit;idleBlendStart=now;$('#selector').hidden=true;app.classList.remove('choosing','preparing-selector');window.clockDeviceCanvas.setTheme({screen:editing?screenChange:screenBlue});const oldChoices=choices.map(c=>c.mesh);choices=[];selectorClosing=false;homeEntry={start:now,duration:reduced.matches?0:270};busy=true;updateLabels();targets[selectedSlot]?.focus();deferClear(oldChoices);}
function closeSelector(){if(selectorClosing)return;selectorClosing=true;busy=true;selectorStart=performance.now();$('#search').blur();if(reduced.matches)finishSelectorClose();}
$('#close-selector').addEventListener('click',closeSelector);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(view==='selector')closeSelector();else if(editing)setEdit(false);}});
function selectCity(id){
 if(id===slots[selectedSlot]){closeSelector();return;}
 if(!cities[id].kind){
  const occupied=slots.indexOf(id);
  if(occupied!==-1){
   const replaced=slots[selectedSlot];[slots[selectedSlot],slots[occupied]]=[slots[occupied],slots[selectedSlot]];save();buildHome();closeSelector();announce(`${cities[id].name} and ${cities[replaced].name} exchanged positions.`);return;
  }
 }
 if(cities[id].custom){editCustomTimer(id);return;}const picked=choices.find(c=>c.mesh.userData.city.id===id);if(!picked)return;const old=homes[selectedSlot];old.removeFromParent();catalogScene.remove(picked.mesh);choices=choices.filter(c=>c!==picked);homes[selectedSlot]=picked.mesh;const p=placements[selectedSlot];picked.mesh.position.set(...p);picked.mesh.scale.setScalar(selectedSlot===4?1.14:.80);picked.mesh.rotation.z=0;scene.add(picked.mesh);slots[selectedSlot]=id;save();updateLabels();deferClear([old]);installHomeControls();closeSelector();announce(`${cities[id].name} now occupies that position. `);
}
function geographicLayout(available){
 const columns=6,rows=5,layout=new Map(),sorted=[...available].sort((a,b)=>coordinates[a.id][1]-coordinates[b.id][1]);
 for(let col=0;col<columns;col++)sorted.slice(col*rows,(col+1)*rows).sort((a,b)=>coordinates[b.id][0]-coordinates[a.id][0]).forEach((city,row)=>layout.set(city.id,{col,row}));
 return {layout,columns,rows};
}
function compactLayout(items,focusId){
 const radius=Math.ceil((Math.sqrt(Math.max(1,items.length))-1)/2),columns=radius*2+1,rows=columns,layout=new Map(),focus=items.find(item=>item.id===focusId)??items[0];if(!focus)return{layout,columns:1,rows:1};layout.set(focus.id,{col:radius,row:radius});
 const cells=[];for(let ring=1;ring<=radius;ring++)for(let y=-ring;y<=ring;y++)for(let x=-ring;x<=ring;x++)if(Math.max(Math.abs(x),Math.abs(y))===ring)cells.push({col:radius+x,row:radius+y,angle:Math.atan2(y,x)});cells.sort((a,b)=>Math.max(Math.abs(a.col-radius),Math.abs(a.row-radius))-Math.max(Math.abs(b.col-radius),Math.abs(b.row-radius))||a.angle-b.angle);
 items.filter(item=>item.id!==focus.id).forEach((item,i)=>layout.set(item.id,cells[i]));return{layout,columns,rows};
}
function timerCatalogItems(anchorId){const anchor=cities[anchorId];if(anchor?.kind!=='timer'||timerItems.some(item=>item.id===anchorId))return timerItems;return timerItems.map(item=>item.custom?anchor:item);}
function anchorForCatalog(anchorSlot=selectedSlot??4){const current=cities[slots[anchorSlot]];if(catalogMode==='clocks')return current&&!current.kind?current.id:(cities[slots[4]]&&!cities[slots[4]].kind?slots[4]:0);if(catalogMode==='timer')return current?.kind==='timer'?current.id:timerItems.find(item=>item.custom).id;return chronoItem.id;}
function wrappedCell(cell,anchor,columns,rows){const wrap=(value,size)=>((value%size)+size)%size;return{col:wrap(cell.col-anchor.col+Math.floor(columns/2),columns)-Math.floor(columns/2),row:wrap(cell.row-anchor.row+Math.floor(rows/2),rows)-Math.floor(rows/2)};}
function placeChoice(choice,x,y){choice.x=x;choice.y=y;choice.mesh.position.set(x/catalogUnit,-y/catalogUnit,0);Object.assign(choice.button.style,{left:x-1.035*catalogUnit+'px',top:y-1.26*catalogUnit+'px'});}
function positionWrappedChoices(recenter=true){
 if(!catalogWrap||!choices.length)return;const {tileWidth,tileHeight}=catalogWrap;
 if(recenter&&!catalogScrollAdjusting){let dx=0,dy=0,left=catalog.scrollLeft,top=catalog.scrollTop;while(left<tileWidth*.5){left+=tileWidth;dx+=tileWidth;}while(left>tileWidth*1.5){left-=tileWidth;dx-=tileWidth;}while(top<tileHeight*.5){top+=tileHeight;dy+=tileHeight;}while(top>tileHeight*1.5){top-=tileHeight;dy-=tileHeight;}if(dx||dy){catalogScrollAdjusting=true;catalog.scrollLeft+=dx;catalog.scrollTop+=dy;if(snapTarget){snapTarget.x+=dx;snapTarget.y+=dy;}catalogScrollAdjusting=false;}}
 const centerX=catalog.scrollLeft+catalog.clientWidth/2,centerY=catalog.scrollTop+catalog.clientHeight/2;
 choices.forEach(choice=>{const x=choice.baseX+Math.round((centerX-choice.baseX)/tileWidth)*tileWidth,y=choice.baseY+Math.round((centerY-choice.baseY)/tileHeight)*tileHeight;placeChoice(choice,x,y);});
}
function reanchorCatalog(anchorSlot=selectedSlot??4){
 if(!catalogWrap||!choices.length)return;const anchorId=anchorForCatalog(anchorSlot),anchorChoice=choices.find(choice=>choice.mesh.userData.city.id===anchorId)??choices[0],anchor=anchorChoice.rawCell,{columns,rows,tileWidth,tileHeight,padX,padY}=catalogWrap;
 choices.forEach(choice=>{const cell=wrappedCell(choice.rawCell,anchor,columns,rows);choice.baseX=padX+tileWidth+cell.col*cellWidth;choice.baseY=padY+tileHeight+cell.row*cellHeight;});catalogWrap.anchorId=anchorId;catalogFocusId=anchorId;
 catalog.scrollLeft=tileWidth;catalog.scrollTop=tileHeight;positionWrappedChoices(false);
}
function fitCatalogViewport(){if(!catalogWrap)return;const viewportWidth=catalog.clientWidth,viewportHeight=catalog.clientHeight;if(!viewportWidth||!viewportHeight)return;catalogWrap.padX=viewportWidth/2;catalogWrap.padY=viewportHeight/2;const grid=$('#city-grid');grid.style.width=viewportWidth+3*catalogWrap.tileWidth+'px';grid.style.height=viewportHeight+3*catalogWrap.tileHeight+'px';}
function currentCatalogFocus(){if(!choices.length)return null;positionWrappedChoices(false);const x=catalog.scrollLeft+catalog.clientWidth/2,y=catalog.scrollTop+catalog.clientHeight/2;return choices.reduce((best,choice)=>Math.hypot(choice.x-x,choice.y-y)<Math.hypot(best.x-x,best.y-y)?choice:best).mesh.userData.city.id;}
function nearestCatalogResult(items,referenceId){
 if(!items.length)return null;const exact=items.find(item=>item.id===referenceId);if(exact)return exact;const reference=cities[referenceId];if(catalogMode==='clocks'&&reference&&!reference.kind){const [lat,lon]=coordinates[reference.id];return items.reduce((best,item)=>{const [itemLat,itemLon]=coordinates[item.id],[bestLat,bestLon]=coordinates[best.id],longitude=(value)=>Math.abs(((value-lon+540)%360)-180);return Math.hypot(itemLat-lat,longitude(itemLon)*.6)<Math.hypot(bestLat-lat,longitude(bestLon)*.6)?item:best;});}if(catalogMode==='timer'&&reference?.kind==='timer')return items.reduce((best,item)=>Math.abs((item.total??0)-reference.total)<Math.abs((best.total??0)-reference.total)?item:best);return items[0];
}
let catalogWarmTimer=null;
function warmCatalogGpu(){if(!choices.length)return;const cw=catalog.clientWidth||w,ch=catalog.clientHeight||Math.max(1,h-217),now=new Date();catalogCamera.aspect=w/h;catalogCamera.position.set((catalog.scrollLeft+cw/2)/catalogUnit,-(catalog.scrollTop+ch/2)/catalogUnit,h/(2*Math.tan(THREE.MathUtils.degToRad(catalogCamera.fov/2))*catalogUnit));catalogCamera.updateProjectionMatrix();choices.forEach(({mesh})=>{updateClock(mesh,now);mesh.updateMatrixWorld(true);});const previous=renderer.getRenderTarget();renderer.setRenderTarget(catalogWarmTarget);renderer.clear();renderer.render(catalogScene,catalogCamera);renderer.setRenderTarget(previous);}
function scheduleCatalogWarm(){if(catalogWarmTimer||choices.length)return;catalogWarmTimer=setTimeout(()=>{catalogWarmTimer=null;if(editing&&view==='home'&&!choices.length){$('#search').value='';buildCatalog(false,4);warmCatalogGpu();}},0);}
function centerCatalog(anchorSlot=selectedSlot??4){if(!choices.length)return;if(catalogWrap){reanchorCatalog(anchorSlot);return;}const viewportWidth=catalog.clientWidth||w,viewportHeight=catalog.clientHeight||Math.max(1,h-217),anchorId=catalogFocusId??anchorForCatalog(anchorSlot),middle=choices.find(c=>c.mesh.userData.city.id===anchorId)??choices[Math.floor(choices.length/2)];catalog.scrollLeft=middle.x-viewportWidth/2;catalog.scrollTop=middle.y-viewportHeight/2;}
function buildCatalog(center=false,anchorSlot=selectedSlot??4,preferredId=null){
 const referenceId=preferredId??currentCatalogFocus()??anchorForCatalog(anchorSlot);
 choices.forEach(c=>clearGroup(c.mesh));choices=[];panVelocity={x:0,y:0};snapTarget=null;snapDue=0;
 const query=normalize($('#search').value),anchorId=anchorForCatalog(anchorSlot),normal=!query&&catalogMode!=='chrono';let source=catalogMode==='clocks'?cities.filter(c=>!c.kind):catalogMode==='chrono'?[chronoItem]:timerCatalogItems(anchorId),filtered=source.filter(c=>normalize(c.name).includes(query));if(catalogMode==='timer'&&/^\d{1,2}:\d{1,2}$/.test(query)){const [m,sec]=query.split(':').map(Number),total=Math.min(5999,m*60+sec);filtered=source.filter(c=>c.total===total&&!c.custom);if(!filtered.length){const item={id:cities.length,kind:'timer',name:formatDuration(total),country:'Timer',total,color:'#ede4d3'};cities.push(item);filtered=[item];}}
 const grid=$('#city-grid');grid.replaceChildren();$('#empty').hidden=!!filtered.length;
 catalogFocusId=normal?anchorId:nearestCatalogResult(filtered,referenceId)?.id??null;const ordered=normal?filtered:[...filtered].sort((a,b)=>a.id===catalogFocusId?-1:b.id===catalogFocusId?1:0);const {layout,columns,rows}=normal?(catalogMode==='clocks'?geographicLayout(ordered):durationLayout(ordered)):compactLayout(ordered,catalogFocusId);catalogColumns=columns;
 const viewportWidth=catalog.clientWidth||w,viewportHeight=catalog.clientHeight||Math.max(1,h-217),padX=viewportWidth/2,padY=viewportHeight/2;
 catalogWrap=normal?{columns,rows,tileWidth:columns*cellWidth,tileHeight:rows*cellHeight,padX,padY,anchorId}:null;app.classList.toggle('infinite-catalog',!!catalogWrap);
 grid.style.width=(normal?viewportWidth+3*catalogWrap.tileWidth:viewportWidth+(columns-1)*cellWidth)+'px';grid.style.height=(normal?viewportHeight+3*catalogWrap.tileHeight:viewportHeight+(rows-1)*cellHeight)+'px';
 ordered.forEach(city=>{
  const cell=layout.get(city.id),x=padX+cell.col*cellWidth,y=padY+cell.row*cellHeight;
  const b=document.createElement('button');b.className='city-choice';b.dataset.city=city.id;b.setAttribute('aria-label',city.name+', '+city.country);
  Object.assign(b.style,{left:x-1.035*catalogUnit+'px',top:y-1.26*catalogUnit+'px',width:2.07*catalogUnit+'px',height:2.52*catalogUnit+'px'});
  b.addEventListener('click',e=>{if(e.detail===0)selectCity(city.id);});
  const mesh=makeClock(city,{tunnel:true});mesh.position.set(x/catalogUnit,-y/catalogUnit,0);catalogScene.add(mesh);
  const choice={mesh,button:b,x,y,rawCell:cell,baseX:x,baseY:y,hovered:false};choices.push(choice);
  b.addEventListener('pointerenter',()=>choice.hovered=true);b.addEventListener('pointerleave',()=>choice.hovered=false);b.addEventListener('focus',()=>{choice.hovered=true;if(view==='selector')snapToClock(choice);});b.addEventListener('blur',()=>choice.hovered=false);grid.append(b);
 });
 if(choices.length&&center)centerCatalog(anchorSlot);else if(!choices.length){catalog.scrollLeft=0;catalog.scrollTop=0;}
}
let snapTarget=null,snapDue=0;
function snapToClock(choice){
 if(!choices.length)return;
 positionWrappedChoices();
 if(!choice){const x=catalog.scrollLeft+catalog.clientWidth/2,y=catalog.scrollTop+catalog.clientHeight/2;choice=choices.reduce((best,c)=>Math.hypot(c.x-x,c.y-y)<Math.hypot(best.x-x,best.y-y)?c:best);}
 panVelocity={x:0,y:0};snapDue=0;snapTarget={x:choice.x-catalog.clientWidth/2,y:choice.y-catalog.clientHeight/2};
}
function stepCatalogPan(now,dt){
 positionWrappedChoices();if(panGesture)return;
 if(snapDue&&now>=snapDue)snapToClock();
 if(snapTarget){const t=reduced.matches?1:1-Math.exp(-dt/45);catalog.scrollLeft+=(snapTarget.x-catalog.scrollLeft)*t;catalog.scrollTop+=(snapTarget.y-catalog.scrollTop)*t;
  if(Math.abs(catalog.scrollLeft-snapTarget.x)<1&&Math.abs(catalog.scrollTop-snapTarget.y)<1){catalog.scrollLeft=snapTarget.x;catalog.scrollTop=snapTarget.y;snapTarget=null;}
 }else{catalog.scrollLeft+=panVelocity.x*dt;catalog.scrollTop+=panVelocity.y*dt;const friction=Math.exp(-dt/90);panVelocity.x*=friction;panVelocity.y*=friction;}positionWrappedChoices();
}
const catalog=$('#catalog');
const pickingRay=new THREE.Raycaster(),pickingPoint=new THREE.Vector2();
function pickClock(event,isCatalog=false){
 const rect=app.getBoundingClientRect(),local=gestureDelta(event.clientX-rect.left-rect.width/2,event.clientY-rect.top-rect.height/2),x=local.x+w/2,y=local.y+h/2;
 const cam=isCatalog?catalogCamera:camera,roots=isCatalog?choices.map(c=>c.mesh):homes;
 const left=0,top=0,width=w,height=h;
 pickingPoint.set((x-left)/width*2-1,1-(y-top)/height*2);cam.updateMatrixWorld();roots.forEach(g=>g.updateMatrixWorld(true));pickingRay.setFromCamera(pickingPoint,cam);
 const hit=pickingRay.intersectObjects(roots,true)[0];if(!hit)return null;let root=hit.object;while(root.parent&&!roots.includes(root))root=root.parent;return roots.includes(root)?root:null;
}
app.addEventListener('click',event=>{if(view!=='home'||event.detail===0||event.target.closest('.masthead,#mode-nav,.instrument-action,#duration-editor'))return;const root=pickClock(event);if(root){event.preventDefault();event.stopPropagation();tap(homes.indexOf(root),event);}},true);
function hoverOnly(groups,root){groups.forEach(group=>group.userData.hovered=group===root);}
app.addEventListener('pointermove',event=>{if(view!=='home')return;const blocked=event.target.closest('.masthead,#mode-nav,#duration-editor'),root=blocked?null:pickClock(event);hoverOnly(homes,root);host.style.cursor=root?'pointer':'';});
app.addEventListener('pointerleave',()=>{hoverOnly(homes,null);hoverOnly(choices.map(choice=>choice.mesh),null);host.style.cursor='';});
function gestureDelta(dx,dy){const rect=app.getBoundingClientRect(),root=window.clockDeviceCanvas.root,angle=root.classList.contains('dc-handset')?parseFloat(root.style.getPropertyValue('--dc-handset-rotation'))||0:0,radians=angle*Math.PI/180,scale=w/(angle?rect.height:rect.width);return{x:(Math.cos(radians)*dx+Math.sin(radians)*dy)*scale,y:(-Math.sin(radians)*dx+Math.cos(radians)*dy)*scale};}
catalog.addEventListener('pointerdown',e=>{if(e.button!==0||selectorClosing)return;snapTarget=null;snapDue=0;panVelocity={x:0,y:0};panGesture={id:e.pointerId,x:e.clientX,y:e.clientY,last:e.timeStamp,moved:false,city:pickClock(e,true)?.userData.city.id};catalog.setPointerCapture(e.pointerId);});
catalog.addEventListener('pointermove',e=>{const root=pickClock(e,true);hoverOnly(choices.map(choice=>choice.mesh),root);choices.forEach(choice=>choice.hovered=choice.mesh===root);const g=panGesture;if(!g||g.id!==e.pointerId)return;const d=gestureDelta(e.clientX-g.x,e.clientY-g.y);if(!g.moved&&Math.hypot(d.x,d.y)<5)return;g.moved=true;catalog.classList.add('is-dragging');catalog.scrollLeft-=d.x;catalog.scrollTop-=d.y;const dt=Math.max(8,e.timeStamp-g.last);panVelocity={x:-d.x/dt,y:-d.y/dt};g.x=e.clientX;g.y=e.clientY;g.last=e.timeStamp;});
catalog.addEventListener('pointerleave',()=>{choices.forEach(choice=>{choice.hovered=false;choice.mesh.userData.hovered=false;});});
catalog.addEventListener('pointerup',e=>{const g=panGesture;if(!g||g.id!==e.pointerId)return;panGesture=null;snapDue=performance.now()+150;catalog.classList.remove('is-dragging');if(catalog.hasPointerCapture(e.pointerId))catalog.releasePointerCapture(e.pointerId);if(!g.moved&&g.city!==undefined)selectCity(Number(g.city));if(reduced.matches||e.timeStamp-g.last>100)panVelocity={x:0,y:0};});
catalog.addEventListener('pointercancel',()=>{panGesture=null;panVelocity={x:0,y:0};catalog.classList.remove('is-dragging');});
catalog.addEventListener('wheel',()=>{snapTarget=null;snapDue=performance.now()+140;panVelocity={x:0,y:0};},{passive:true});
catalog.addEventListener('scroll',()=>{positionWrappedChoices();if(!catalogScrollAdjusting&&!panGesture&&!snapTarget&&Math.hypot(panVelocity.x,panVelocity.y)<.02&&!snapDue)snapDue=performance.now()+140;},{passive:true});
catalog.addEventListener('keydown',e=>{const delta={ArrowLeft:[-140,0],ArrowRight:[140,0],ArrowUp:[0,-170],ArrowDown:[0,170]}[e.key];if(delta){e.preventDefault();panVelocity={x:0,y:0};snapTarget=null;catalog.scrollBy(...delta);snapDue=performance.now()+80;}});
$('#search').addEventListener('input',()=>{const focus=currentCatalogFocus();buildCatalog(true,selectedSlot??4,focus);});$('#clear-search').addEventListener('click',()=>{$('#search').value='';buildCatalog(true);$('#search').focus();});$('#search-form').addEventListener('submit',e=>{e.preventDefault();$('#search').blur();const focused=choices.find(c=>c.mesh.userData.city.id===catalogFocusId)??choices[0];focused?.button.focus();});

function formatDuration(seconds){seconds=Math.max(0,Math.min(5999,Math.round(seconds)));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
function parseTimerValue(value){const digits=value.replace(/\D/g,'').padEnd(4,'0').slice(0,4),minutes=Number(digits.slice(0,2)),seconds=Number(digits.slice(2));return Math.min(5999,minutes*60+seconds);}
function installDurationInput(input,onCommit){const slots=[0,1,3,4],selection=[0,5];let caret=null;const commit=()=>{const seconds=parseTimerValue(input.value);input.value=formatDuration(seconds);onCommit(seconds);input.classList.remove('digits-engage');void input.offsetWidth;input.classList.add('digits-commit');};const edit=(text,kind='insert')=>{const start=input.selectionStart??0,end=input.selectionEnd??0,chars=input.value.padEnd(5,'0').slice(0,5).split('');let next=start;if(end>start)for(const slot of slots)if(slot>=start&&slot<end)chars[slot]='0';if(kind==='backward'||kind==='forward'){if(start===end){const slot=kind==='backward'?[...slots].reverse().find(p=>p<start):slots.find(p=>p>=start);if(slot!==undefined){chars[slot]='0';next=slot;}}}else{let index=slots.findIndex(p=>p>=start);if(index<0)index=4;for(const digit of text.replace(/\D/g,'')){if(index>=4)break;const slot=slots[index++];chars[slot]=digit;next=index<4?slots[index]:5;}}chars[2]=':';input.value=chars.join('');caret=next;input.setSelectionRange(caret,caret);selection[0]=caret;selection[1]=caret;};input.addEventListener('focus',()=>{input.select();selection[0]=0;selection[1]=5;input.classList.remove('digits-commit');void input.offsetWidth;input.classList.add('digits-engage');});input.addEventListener('click',()=>{input.select();selection[0]=0;selection[1]=5;});input.addEventListener('select',()=>{selection[0]=input.selectionStart??0;selection[1]=input.selectionEnd??0;});input.addEventListener('beforeinput',event=>{if(event.inputType.startsWith('delete')){event.preventDefault();edit('',event.inputType.includes('Backward')?'backward':'forward');}else if(event.inputType.startsWith('insert')&&event.data!==null){event.preventDefault();edit(event.data);}});input.addEventListener('paste',event=>{event.preventDefault();let pasted=event.clipboardData.getData('text');if(/^\s*\d{1,2}:\d{1,2}\s*$/.test(pasted)){const [m,s]=pasted.trim().split(':');pasted=m.padStart(2,'0')+s.padStart(2,'0');}edit(pasted);});input.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey)return;if(event.key==='Enter'){event.preventDefault();input.blur();}else if(/^\d$/.test(event.key)){event.preventDefault();edit(event.key);}else if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();edit('',event.key==='Backspace'?'backward':'forward');}else if(event.key.length===1)event.preventDefault();});input.addEventListener('blur',commit);}
function resize(){w=app.clientWidth;h=app.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const framed=!window.clockDeviceCanvas.handset;camera.position.z=Math.max(16,16*650/h);camera.position.y=framed?.245:0;camera.fov=framed?THREE.MathUtils.radToDeg(2*Math.atan(h/802*Math.tan(THREE.MathUtils.degToRad(21)))):42;camera.aspect=w/h;camera.updateProjectionMatrix();catalogCamera.fov=camera.fov;catalogCamera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(app);
const v=new THREE.Vector3();
function projectTargets(){homes.forEach((g,i)=>{g.updateMatrixWorld(true);const halfHeight=1.26;const points=[[-1.04,halfHeight,.2],[1.04,-halfHeight,.2]].map(p=>{v.set(...p).applyMatrix4(g.matrixWorld).project(camera);return{x:(v.x+1)*w/2,y:(1-v.y)*h/2};});const b=targets[i];Object.assign(b.style,{left:points[0].x+'px',top:points[0].y+'px',width:Math.max(44,points[1].x-points[0].x)+'px',height:Math.max(44,points[1].y-points[0].y)+'px',zIndex:i===4?'2':'1'});});}
function updateClock(g,now){if(g.userData.city.kind){updateInstrument(g,now.getTime());return;}const d=g.userData,t=d.city.fmt.format(now).split(':').map(Number),s=t[2],m=t[1]+s/60,hr=t[0]%12+m/60;d.hours.rotation.z=-hr*Math.PI/6;d.minutes.rotation.z=-m*Math.PI/30;d.seconds.rotation.z=-s*Math.PI/30;d.updateGmt(now);}
function colorDepth(g,amount){g.userData.materials.forEach(m=>m.color.copy(m.userData.base).lerp(cream,amount));}
const clamp01=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp01(n);return n*n*(3-2*n);};
const smoother=n=>{n=clamp01(n);return n*n*n*(n*(n*6-15)+10);};
const backOut=n=>{n=clamp01(n);const pull=1.42,curve=pull+1;return 1+curve*Math.pow(n-1,3)+pull*Math.pow(n-1,2);};
function between(a,b,t){return a+(b-a)*t;}
function restoreHomeHover(){homes.forEach(g=>{g.position.z+=g.userData.hoverApplied??0;g.userData.hoverApplied=0;});}
function applyHover(g,dt,active=g.userData.hovered){const target=active?.34:0,current=g.userData.hoverSink??0,amount=reduced.matches?target:between(current,target,1-Math.exp(-dt/(active?48:72)));g.userData.hoverSink=Math.abs(amount)<.001?0:amount;g.position.z-=g.userData.hoverSink;return g.userData.hoverSink;}
function stepSwap(now){if(!transition)return;const t=transition,p=t.duration?Math.min(1,(now-t.start)/t.duration):1;
 const retreat=smooth(p/.24),exchange=smooth((p-.27)/.37),returning=smooth((p-.66)/.18),grow=smooth((p-.82)/.18),picked=t.index,a=placements[4],b=placements[picked],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.max(.001,Math.hypot(dx,dy)),px=-dy/length,py=dx/length;
 const stage=index=>{const place=placements[index];if(index===4)return[place[0],place[1],-9];const radial=Math.max(.001,Math.hypot(place[0],place[1]));return[place[0]+place[0]/radial*.64,place[1]+place[1]/radial*.64,-9];};
 homes.forEach((g,i)=>{const finalIndex=i===4?picked:i===picked?4:i,from=placements[i],to=placements[finalIndex],stageFrom=stage(i),stageTo=stage(finalIndex),isExchange=i===4||i===picked,side=i===4?-1:1,arc=isExchange?Math.sin(Math.PI*exchange)*.76*side:0;let x=between(from[0],stageFrom[0],retreat),y=between(from[1],stageFrom[1],retreat);x=between(x,stageTo[0],exchange)+px*arc;y=between(y,stageTo[1],exchange)+py*arc;x=between(x,to[0],returning);y=between(y,to[1],returning);const sourceScale=i===4?1.14:.80,targetScale=finalIndex===4?1.14:.80,collapsed=sourceScale*between(1,.38,retreat),scale=between(collapsed,targetScale,grow),depth=returning?between(-9,to[2],returning):between(from[2],-9,retreat);g.position.set(x,y,depth);g.scale.setScalar(scale);g.rotation.z=(isExchange?side:Math.sign(from[0]||1))*(Math.sin(Math.PI*retreat)-Math.sin(Math.PI*returning))*.042;});
 if(p===1){[homes[4],homes[picked]]=[homes[picked],homes[4]];[slots[4],slots[picked]]=[slots[picked],slots[4]];for(const i of [4,picked]){homes[i].position.set(...placements[i]);homes[i].scale.setScalar(i===4?1.14:.80);homes[i].rotation.set(0,0,0);homes[i].userData.face.rotation.set(0,0,0);}save();updateLabels();transition=null;busy=false;}}
const remotePivot=new THREE.Vector3(),rotatedPivot=new THREE.Vector3();
function anchorAtPrismEnd(g,i){const place=placements[i],depth=g.userData.pivotDepth;remotePivot.set(0,0,-depth);rotatedPivot.copy(remotePivot).applyEuler(g.rotation);g.position.set(place[0]+remotePivot.x-rotatedPivot.x,place[1]+remotePivot.y-rotatedPivot.y,place[2]+remotePivot.z-rotatedPivot.z);}
function stepEditPulse(now){if(!editPulse||transition)return;const p=editPulse.duration?Math.min(1,(now-editPulse.start)/editPulse.duration):1;homes.forEach((g,i)=>{const delay=(i%3)*.026+Math.floor(i/3)*.017,q=clamp01((p-delay)/(1-delay)),envelope=Math.sin(Math.PI*q),wobble=Math.sin(Math.PI*q*4)*(1-q),settle=1-smooth(q),retreat=-Math.sin(Math.PI*q)*1.05,overshoot=Math.sin(Math.PI*2*q)*.18*(1-q),depth=retreat+overshoot;g.scale.setScalar((i===4?1.14:.80)*(1+envelope*.07));g.rotation.x*=settle;g.rotation.y*=settle;g.rotation.z=(i%2?1:-1)*wobble*.045;anchorAtPrismEnd(g,i);g.position.z+=depth;g.userData.face.rotation.x*=settle;g.userData.face.rotation.y*=settle;g.userData.face.rotation.z*=settle;});if(p===1){homes.forEach((g,i)=>{g.position.set(...placements[i]);g.scale.setScalar(i===4?1.14:.80);g.rotation.set(0,0,0);g.userData.face.rotation.set(0,0,0);});editPulse=null;idleBlendStart=now;}}
function stepEditingIdle(now){if(view!=='home'||!editing||busy||editPulse||transition||viewChange||homeEntry||reduced.matches)return;const time=now*.001;homes.forEach((g,i)=>{const phase=i*1.31,orbit=time*2.65+phase,spring=time*6.1+phase*1.37,ax=Math.sin(orbit)*.0062+Math.sin(spring)*.0012,ay=Math.cos(orbit)*.0072+Math.cos(spring)*.0014,hovered=g.userData.hovered,target=hovered?new THREE.Quaternion():new THREE.Quaternion().setFromEuler(new THREE.Euler(ax,ay,Math.sin(time*3.15+phase)*.0035)),depthWave=Math.sin(time*1.72+phase)*.16+Math.sin(time*.86+phase*.63)*.045;g.quaternion.slerp(target,hovered?.32:smooth((now-idleBlendStart)/280));g.scale.setScalar(i===4?1.14:.80);if(hovered){g.userData.face.rotation.x*=.68;g.userData.face.rotation.y*=.68;g.userData.face.rotation.z*=.68;}else g.userData.face.rotation.set(-ax*.18,-ay*.18,0);anchorAtPrismEnd(g,i);g.position.z+=depthWave;});}
function stepMainPulse(now){if(!mainPulse||transition||view!=='home')return;const p=mainPulse.duration?Math.min(1,(now-mainPulse.start)/mainPulse.duration):1,dip=Math.sin(Math.PI*p);homes[4].scale.setScalar(1.14*(1-dip*.24));homes[4].position.z=placements[4][2]-dip*.72;if(p===1){homes[4].scale.setScalar(1.14);homes[4].position.set(...placements[4]);mainPulse=null;}}
function stepViewChange(now){if(!viewChange)return;const raw=viewChange.duration?Math.min(1,(now-viewChange.start)/viewChange.duration):1,q=smoother(raw);homes.forEach((g,i)=>{const base=i===4?1.14:.80,p=placements[i];g.position.set(p[0],p[1],p[2]-14*q);g.scale.setScalar(base*between(1,.38,q));});if(raw===1)enterSelector(now);}
function stepHomeEntry(now){if(!homeEntry)return;const raw=homeEntry.duration?Math.min(1,(now-homeEntry.start)/homeEntry.duration):1,q=backOut(raw);homes.forEach((g,i)=>{const base=i===4?1.14:.80,p=placements[i];g.position.set(p[0],p[1],between(p[2]-14,p[2],q));g.scale.setScalar(base*between(.38,1,q));});if(raw===1){resetHomes();homeEntry=null;idleBlendStart=now;busy=false;if(editing){catalogMode='clocks';scheduleCatalogWarm();}}}
let last=0;
function frame(now){requestAnimationFrame(frame);if(document.hidden||now-last<22)return;const dt=Math.min(40,now-last);last=now;const date=new Date();restoreHomeHover();stepSwap(now);stepEditPulse(now);stepViewChange(now);stepHomeEntry(now);stepEditingIdle(now);stepMainPulse(now);renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);renderer.clear();
 if(view==='home'){homes.forEach((g,i)=>{applyHover(g,dt);g.userData.hoverApplied=g.userData.hoverSink;updateClock(g,date);colorDepth(g,i===4?0:.12);applyTimerDisplayFeedback(g,dt);});projectTargets();projectInstrumentControls();renderer.render(scene,camera);}
 else{stepCatalogPan(now,dt);
 const cw=catalog.clientWidth,ch=catalog.clientHeight;catalogCamera.aspect=w/h;catalogCamera.position.set((catalog.scrollLeft+cw/2)/catalogUnit,-(catalog.scrollTop+ch/2)/catalogUnit,h/(2*Math.tan(THREE.MathUtils.degToRad(catalogCamera.fov/2))*catalogUnit));catalogCamera.updateProjectionMatrix();
 const duration=selectorClosing?195:390,raw=reduced.matches?1:Math.min(1,(now-selectorStart)/duration),p=selectorClosing?1-smoother(raw):smoother(raw),cushion=selectorClosing?0:Math.sin(Math.PI*clamp01((raw-.68)/.32))*.035;
 let travelY=0;if(catalogTravel){const t=clamp01((now-catalogTravel.start)/360);travelY=-catalogTravel.direction*(1-smoother(t))*h/catalogUnit;if(t===1&&catalogTravel.direction!==0)catalogTravel=null;}choices.forEach(choice=>{const {mesh,x,y}=choice;mesh.position.set(x/catalogUnit,-y/catalogUnit+travelY,-(1-p)*15);mesh.scale.setScalar((.34+.66*p)*(1+cushion)*(catalogMode==='chrono'?1.65:1));if(durationContext?.custom&&durationContext.choice?.mesh===mesh){const expansion=smooth((now-durationContext.start)/260);mesh.position.z+=3.5*expansion;mesh.scale.multiplyScalar(1+expansion*.28);}applyHover(mesh,dt,choice.hovered||mesh.userData.hovered);updateClock(mesh,date);colorDepth(mesh,.025);applyCustomTimerSelectorHover(choice,dt);});
 renderer.setViewport(0,0,w,h);renderer.setScissorTest(false);renderer.render(catalogScene,catalogCamera);if(selectorClosing&&raw===1)finishSelectorClose(now);}
}
document.fonts.load('40px Bangers').catch(()=>{}).then(()=>{buildHome();resize();requestAnimationFrame(frame);});



const makeInstrument=instrumentFactory(THREE,mat,box,bevelBody,bevelRing,bevelOutline,engravingFont);
const worldOrder=['clocks','timer','chrono'],worldNames={clocks:'CLOCKS',timer:'TIMERS',chrono:'CHRONO'};
function updateModeNav(){const index=worldOrder.indexOf(catalogMode);for(const [id,offset,direction]of [['mode-up',2,'up'],['mode-down',1,'down']]){const name=worldOrder[(index+offset)%3];$(`#${id} span`).textContent=worldNames[name];$(`#${id}`).setAttribute('aria-label',`Move ${direction} to ${worldNames[name]}`);}app.classList.toggle('chrono-catalog',catalogMode==='chrono');$('#search-form').hidden=catalogMode==='chrono';$('#search').placeholder=catalogMode==='timer'?'Search duration, e.g. 06:30':'Search a city';$('#search').setAttribute('aria-label',catalogMode==='timer'?'Search timer duration':'Search a city');$('#search-form label').textContent=catalogMode==='timer'?'FIND A DURATION':'FIND YOUR NEXT TIME ZONE';$('#empty').textContent=catalogMode==='timer'?'No matching timers. Try another duration.':'No matching cities. Try another search.';$('#selector').setAttribute('aria-label',catalogMode==='timer'?'Choose a timer':catalogMode==='chrono'?'Choose a stopwatch':'Choose a city');}
async function switchCatalog(direction){if(view!=='selector'||selectorClosing||catalogTravel)return;catalogTravel={start:performance.now(),direction:0};const out=host.animate([{transform:'translateY(0)'},{transform:`translateY(${-direction*100}%)`}],{duration:reduced.matches?0:170,easing:'cubic-bezier(.4,0,.8,.5)',fill:'forwards'});await out.finished.catch(()=>{});if(view!=='selector'||selectorClosing){out.cancel();catalogTravel=null;return;}catalogMode=worldOrder[(worldOrder.indexOf(catalogMode)+(direction>0?1:2))%3];$('#search').value='';updateModeNav();buildCatalog(true);warmCatalogGpu();out.cancel();catalogTravel={start:performance.now(),direction};announce(`${worldNames[catalogMode]} selection.`);}
$('#mode-up').addEventListener('click',()=>switchCatalog(-1));$('#mode-down').addEventListener('click',()=>switchCatalog(1));
function durationLayout(items){let columns=Math.min(5,items.length||1);while(columns>1&&items.length%columns)columns--;const rows=Math.max(1,Math.ceil(items.length/columns)),layout=new Map();items.forEach((item,i)=>layout.set(item.id,{col:i%columns,row:Math.floor(i/columns)}));return{layout,columns,rows};}
function instrumentValue(g,now=Date.now()){const s=g.userData.state;if(s.status!=='running')return s.value;return g.userData.city.kind==='timer'?Math.max(0,s.value-(now-s.stamp)/1000):s.value+(now-s.stamp)/1000;}
function timerCanEdit(g){return g.userData.city.kind==='timer'&&(g.userData.state.status==='idle'||g.userData.state.status==='finished');}
function applyCustomTimerSelectorHover(choice,dt){const {mesh}=choice,d=mesh.userData;if(view!=='selector'||!d.city.custom)return;const strength=(choice.hovered||d.hovered)?.34:0,desired=d.dialMaterial.color.clone().lerp(timerHoverBlue,strength),factor=reduced.matches?1:1-Math.exp(-dt/65);if(!d.customSelectorColor)d.customSelectorColor=desired.clone();else d.customSelectorColor.lerp(desired,factor);d.dialMaterial.color.copy(d.customSelectorColor);}
function applyTimerDisplayFeedback(g,dt){if(g.userData.city.kind!=='timer')return;const d=g.userData,activeEdit=!editing&&timerCanEdit(g),hovered=d.displayHover&&activeEdit,pulse=clamp01((performance.now()-d.displayPulseAt)/230),pressBoost=pulse<1?Math.sin(Math.PI*smoother(pulse))*.20:0,strength=hovered?.34+pressBoost:0,desired=d.dialMaterial.color.clone().lerp(timerHoverBlue,strength),factor=reduced.matches?1:1-Math.exp(-dt/65);if(!d.displayFeedbackColor)d.displayFeedbackColor=desired.clone();else d.displayFeedbackColor.lerp(desired,factor);d.dialMaterial.color.copy(d.displayFeedbackColor);}
function updateInstrument(g,now){const d=g.userData,s=d.state,isHome=homes.includes(g),home=isHome&&!editing,value=instrumentValue(g,now);if(s.status==='running'&&d.city.kind==='timer'&&value===0){s.value=0;s.status='finished';d.controlsAt=performance.now();}const minutes=Math.floor(value/60),seconds=Math.floor(value%60);d.showDigits(`${String(minutes%100).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`);d.showFraction?.(String(Math.floor(value*100)%100));const split=s.status==='paused'||s.status==='finished',time=performance.now();if(split!==d.split){d.lastSplit=d.split;d.split=split;d.controlsAt=time;}
 if(d.city.kind==='timer'){const pulse=clamp01((performance.now()-d.displayPulseAt)/230),push=pulse<1?Math.sin(Math.PI*smoother(pulse))*.105:0;d.display.position.z=d.displayBaseZ-push;}
 const transitionDuration=360,p=reduced.matches?1:clamp01((time-d.controlsAt)/transitionDuration),retracting=p<.44,layoutSplit=retracting?d.lastSplit:split,travel=retracting?smooth(p/.44):smooth((p-.44)/.56),depth=retracting?between(.15,-.16,travel):between(-.16,.15,travel),transitionOpacity=retracting?1-travel:travel;
 d.homeAmount=reduced.matches?(home?1:0):between(d.homeAmount??0,home?1:0,.24);const homeDepth=between(-.16,0,d.homeAmount),homeOpacity=d.homeAmount;
 d.primary.visible=isHome&&d.homeAmount>.015;d.reset.visible=isHome&&d.homeAmount>.015&&layoutSplit;d.primary.position.x=layoutSplit?.49:0;d.primary.position.z=depth+homeDepth;d.reset.position.z=depth+homeDepth;d.primary.scale.set(layoutSplit?1:1.35,1,1);d.reset.scale.set(1,1,1);
 const desiredLabel=s.status==='running'?'PAUSE':s.status==='paused'?'CONTINUE':'START';if(!retracting||p===1)d.primary.userData.setLabel(desiredLabel);const labelTime=time-(d.labelAt??-1000),labelFade=labelTime<90?1-labelTime/90:Math.min(1,(labelTime-90)/100),opacity=transitionOpacity*homeOpacity;d.primary.userData.label.material.opacity=opacity*labelFade;d.reset.userData.label.material.opacity=opacity;
 for(const name of ['primary','reset']){const control=d[name],held=d.controlHeld[name],hovered=d.controlHover[name],target=held?.085:hovered?.025:0;control.userData.interactionZ=between(control.userData.interactionZ??0,target,held?.42:.24);control.position.z-=control.userData.interactionZ;}
}
function actInstrument(g,action){if(editing||view!=='home'||busy)return;const d=g.userData,s=d.state,now=Date.now();if(action==='edit'){if(timerCanEdit(g))openDurationEditor(g);else promote(homes.indexOf(g));return;}if(action==='reset'){s.value=d.city.kind==='timer'?s.total:0;s.status='idle';}else if(s.status==='running'){s.value=instrumentValue(g,now);s.status='paused';}else{if(d.city.kind==='timer'&&s.status==='finished')s.value=s.total;if(d.city.kind==='timer'&&s.value===0){openDurationEditor(g);return;}s.stamp=now;s.status='running';}d.labelAt=performance.now();announce(`${d.city.kind==='timer'?'Timer':'Chrono'} ${s.status}.`);}
let instrumentButtons=[];
function installHomeControls(){const layer=$('#instrument-targets');layer.replaceChildren();instrumentButtons=[];homes.forEach(g=>{if(!g.userData.city.kind)return;for(const action of ['primary','reset','edit']){if(action==='edit'&&g.userData.city.kind!=='timer')continue;const b=document.createElement('button');b.type='button';b.className='instrument-action';b.dataset.action=action;const controlName=action==='reset'?'reset':action==='primary'?'primary':null;if(controlName){b.addEventListener('pointerenter',()=>g.userData.controlHover[controlName]=true);b.addEventListener('pointerleave',()=>{g.userData.controlHover[controlName]=false;g.userData.controlHeld[controlName]=false;});b.addEventListener('pointerdown',e=>{if(e.button===0){g.userData.controlHeld[controlName]=true;e.stopPropagation();}});for(const eventName of ['pointerup','pointercancel'])b.addEventListener(eventName,()=>g.userData.controlHeld[controlName]=false);b.addEventListener('focus',()=>g.userData.controlHover[controlName]=true);b.addEventListener('blur',()=>{g.userData.controlHover[controlName]=false;g.userData.controlHeld[controlName]=false;});}else{b.addEventListener('pointerenter',()=>g.userData.displayHover=true);b.addEventListener('pointerleave',()=>{g.userData.displayHover=false;g.userData.displayPressed=false;});b.addEventListener('pointerdown',e=>{if(e.button===0){g.userData.displayPressed=true;g.userData.displayPulseAt=performance.now();e.stopPropagation();}});for(const eventName of ['pointerup','pointercancel'])b.addEventListener(eventName,()=>g.userData.displayPressed=false);b.addEventListener('focus',()=>g.userData.displayHover=true);b.addEventListener('blur',()=>{g.userData.displayHover=false;g.userData.displayPressed=false;});}b.addEventListener('click',e=>{e.stopPropagation();actInstrument(g,action);});b.addEventListener('dblclick',e=>e.stopPropagation());layer.append(b);instrumentButtons.push({g,b,action});}});}
function projectInstrumentControls(){for(const {g,b,action}of instrumentButtons){const d=g.userData,control=action==='edit'?d.display:d[action],visible=view==='home'&&!editing&&!busy&&(action!=='reset'||d.reset.visible)&&(action!=='edit'||timerCanEdit(g));b.hidden=!visible;if(!visible){if(action==='edit'){d.displayHover=false;d.displayPressed=false;}continue;}control.updateWorldMatrix(true,false);const sx=action==='edit'?.72:.47,sy=action==='edit'?.45:.30,points=[[-sx,sy,.12],[sx,-sy,.12]].map(p=>{const v=new THREE.Vector3(...p).applyMatrix4(control.matrixWorld).project(camera);return{x:(v.x+1)*w/2,y:(1-v.y)*h/2};});Object.assign(b.style,{left:points[0].x+'px',top:points[0].y+'px',width:Math.max(30,points[1].x-points[0].x)+'px',height:Math.max(30,points[1].y-points[0].y)+'px',zIndex:homes.indexOf(g)===4?'4':'3'});const name=action==='edit'?'Edit remaining time':action==='reset'?'Reset':d.state.status==='running'?'Pause':d.state.status==='paused'?'Continue':'Start';b.setAttribute('aria-label',`${name} ${d.city.kind} in position ${homes.indexOf(g)+1}`);if(action==='edit')b.setAttribute('aria-description',formatDuration(instrumentValue(g))); }}
let durationContext=null;
const durationEditor=$('#duration-editor'),durationInput=$('#duration-input');
function openDurationEditor(g){durationContext={g};durationInput.value=formatDuration(instrumentValue(g));durationEditor.hidden=false;durationInput.focus();}
function editCustomTimer(id){const choice=choices.find(c=>c.mesh.userData.city.id===id);durationContext={custom:true,choice,start:performance.now()};snapToClock(choice);durationInput.value='00:00';durationEditor.hidden=false;durationInput.focus();if(choice)choice.mesh.scale.setScalar(1.7);}
installDurationInput(durationInput,seconds=>{const context=durationContext;if(!context)return;durationContext=null;durationEditor.hidden=true;if(context.custom){const item={id:cities.length,name:formatDuration(seconds),country:'Timer',kind:'timer',total:seconds,color:'#ede4d3'};cities.push(item);const mesh=makeClock(item,{tunnel:true});catalogScene.add(mesh);choices.push({mesh,button:context.choice.button,x:context.choice.x,y:context.choice.y});selectCity(item.id);}else{const s=context.g.userData.state;if(s.status==='idle'||s.status==='finished'){s.total=seconds;s.value=seconds;s.status='idle';const item={...context.g.userData.city,id:cities.length,total:seconds,name:formatDuration(seconds)};cities.push(item);context.g.userData.city=item;slots[homes.indexOf(context.g)]=item.id;save();updateLabels();}else{s.value=Math.min(s.total,seconds);s.stamp=Date.now();}}});
durationEditor.addEventListener('submit',e=>{e.preventDefault();durationInput.blur();});
app.addEventListener('pointerdown',e=>{if(durationContext&&!durationEditor.contains(e.target))durationInput.blur();},true);
updateModeNav();

