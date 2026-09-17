// These factories receive the existing scene's geometry and printed-paper shader.
export function instrumentFactory(THREE,mat,box,bevelBody,bevelRing,bevelOutline,font){
 function letterShapes(text,size,height=.23,offsetY=0){
  const commands=[];let pen=0;for(const char of text){const glyph=font.charToGlyph(char),path=glyph.getPath(pen,0,100);commands.push(...path.commands);pen+=glyph.advanceWidth/font.unitsPerEm*100;}const points=commands.filter(c=>c.x!==undefined),b={x1:Math.min(...points.map(c=>c.x)),x2:Math.max(...points.map(c=>c.x)),y1:Math.min(...points.map(c=>c.y)),y2:Math.max(...points.map(c=>c.y))},scale=Math.min(size/(b.x2-b.x1),.23/(b.y2-b.y1)),out=new THREE.ShapePath(),path={commands};
  const letterScale=Math.min(size/(b.x2-b.x1),height/(b.y2-b.y1));
  const X=x=>(x-(b.x1+b.x2)/2)*letterScale,Y=v=>-(v-(b.y1+b.y2)/2)*letterScale+offsetY;
  for(const c of path.commands){if(c.type==='M')out.moveTo(X(c.x),Y(c.y));else if(c.type==='L')out.lineTo(X(c.x),Y(c.y));else if(c.type==='Q')out.quadraticCurveTo(X(c.x1),Y(c.y1),X(c.x),Y(c.y));else if(c.type==='C')out.bezierCurveTo(X(c.x1),Y(c.y1),X(c.x2),Y(c.y2),X(c.x),Y(c.y));else if(c.type==='Z')out.currentPath.closePath();}
  return out.toShapes(false);
 }
 function lettering(parent,text,y,size,color){
  const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(letterShapes(text,size),{depth:.025,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1,curveSegments:4}),mat(color,.1));mesh.position.set(0,y,.15);parent.add(mesh);return mesh;
 }
 function engravedFront(parent,title,material,dark){
  const surface=new THREE.Shape();bevelOutline(1.95,2.40,.035).forEach(([x,y],i)=>i?surface.lineTo(x,y):surface.moveTo(x,y));surface.closePath();
  const aperture=new THREE.Path();aperture.moveTo(-.83,-.56);aperture.lineTo(-.83,.64);aperture.lineTo(.83,.64);aperture.lineTo(.83,-.56);aperture.closePath();surface.holes.push(aperture);
  const islands=[];for(const letter of letterShapes(title,1.7,.29,.96)){surface.holes.push(new THREE.Path(letter.getPoints(8)));for(const hole of letter.holes)islands.push(new THREE.Shape(hole.getPoints(8)));}
  const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry([surface,...islands],{depth:.15,bevelEnabled:false,curveSegments:8,steps:1}),material);mesh.position.z=-.015;parent.add(mesh);
  box(parent,0,.96,.068,1.85,.35,.008,mat(dark?'#d8d2dc':'#766679',.55));
 }
 function segment(parent,x,y,horizontal,material){
  const shape=new THREE.Shape();[[-.10,-.015],[-.083,-.034],[.083,-.034],[.10,-.015],[.10,.015],[.083,.034],[-.083,.034],[-.10,.015]].forEach(([a,b],i)=>i?shape.lineTo(a,b):shape.moveTo(a,b));shape.closePath();
  const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.085,bevelEnabled:true,bevelSize:.012,bevelThickness:.021,bevelSegments:1,steps:1}),material);mesh.position.set(x,y,.07);if(!horizontal)mesh.rotation.z=Math.PI/2;parent.add(mesh);return mesh;
 }
 function digital(parent,dark,count=4){
  const group=new THREE.Group();parent.add(group);const material=mat(dark?'#8984a4':'#686078',.1),digits=[];
  const active=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
  for(let i=0;i<count;i++){const g=new THREE.Group();g.position.x=(i-(count-1)/2)*.405+(count===4?(i<2?-.045:.045):0);group.add(g);const seg={};[['a',0,.25,1],['b',.12,.125,0],['c',.12,-.125,0],['d',0,-.25,1],['e',-.12,-.125,0],['f',-.12,.125,0],['g',0,0,1]].forEach(([key,x,y,hor])=>seg[key]=segment(g,x,y,hor,material));digits.push(seg);}
  for(const y of count===4?[-.12,.12]:[-.22]){const dot=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.06,4),material);dot.rotation.x=Math.PI/2;dot.position.set(count===4?0:-.46,y,.1);group.add(dot);}
  group.scale.set(.83,1.06,1);let previous='';return value=>{if(previous===value)return;previous=value;const chars=value.replace(/\D/g,'').padStart(count,'0').slice(-count);digits.forEach((segments,i)=>Object.entries(segments).forEach(([key,mesh])=>mesh.visible=active[Number(chars[i])].includes(key)));};
 }
 function control(parent,reset){
  const group=new THREE.Group();parent.add(group);const material=mat(reset?'#f4f0e5':'#80cfc6',.2);box(group,0,0,0,.77,.40,.14,material);bevelRing(group,bevelOutline(.86,.50,.045),bevelOutline(.73,.35,.03),.005,.13,material);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=72;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Mesh(new THREE.PlaneGeometry(.79,.27),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));label.position.z=.148;group.add(label);let previous='';
  group.userData.setLabel=text=>{if(text===previous)return;previous=text;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,256,72);ctx.font='56px Bangers';ctx.fillStyle='#454155';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,38,246);texture.needsUpdate=true;};group.userData.label=label;group.userData.setLabel(reset?'RESET':'START');return group;
 }
 return function(city,tunnel){
  const root=new THREE.Group(),face=new THREE.Group();root.add(face);const dark=city.kind==='chrono',base=mat(city.color,1),dial=mat('#f2e2cc',2),rim=mat(dark?'#696477':'#d6c7b0',.1);const depth=tunnel?27.335:.335;
  root.userData={city,face,pivotDepth:depth,materials:[base,dial,rim],state:{status:'idle',total:city.total??0,value:city.total??0,stamp:0},controlsAt:0,split:false,lastSplit:false,controlHover:{primary:false,reset:false},controlHeld:{primary:false,reset:false},homeAmount:0};root.userData.materials.forEach(m=>m.userData.base=m.color.clone());
  bevelBody(root,depth,base);engravedFront(face,dark?'CHRONO':'TIMER',base,dark);bevelRing(face,bevelOutline(2.07,2.52,.08),bevelOutline(1.95,2.40,.035),.035,.135,base);
  box(face,0,.04,.11,1.48,1.04,.016,dial);bevelRing(face,bevelOutline(1.66,1.20),bevelOutline(1.48,1.04),.22,.12,rim,.04);
  const display=new THREE.Group();display.position.set(0,.04,.13);face.add(display);root.userData.showDigits=digital(display,dark);
  if(dark){display.position.y=.20;const fraction=new THREE.Group();fraction.position.set(.34,-.29,.13);fraction.scale.set(.6,.6,.7);face.add(fraction);root.userData.showFraction=digital(fraction,dark,2);}
  if(city.custom){display.visible=false;const custom=lettering(face,'XX:XX',0,1.5,'#786881');custom.scale.setScalar(1.65);}
  const primary=control(face,false),reset=control(face,true);primary.position.set(0,-.90,.15);reset.position.set(-.49,-.90,-.2);reset.visible=false;root.userData.primary=primary;root.userData.reset=reset;root.userData.display=display;
  return root;
 };
}
