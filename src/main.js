
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = id => document.getElementById(id);
const isTouch = matchMedia('(pointer:coarse)').matches;

// ============ AUDIO ============
let AC = null;
function ac(){ if (!AC) AC = new (window.AudioContext||window.webkitAudioContext)(); if (AC.state==='suspended') AC.resume(); return AC; }
// ============ LANGUAGE (EN default for international players, Hinglish toggle) ============
let LANG='en'; try{ LANG=localStorage.getItem('ananta_lang')||'en'; }catch(e){}
function L(en,hi){ return LANG==='hi'?hi:en; }
function LB(en,hi){ return LANG==='hi' ? hi+'\n'+en : en+'\n'+hi; }
function LBa(a){ return LB(a[0],a[1]); }
function pick(a){ return LANG==='hi'?a[1]:a[0]; }
function blip(f, dur=0.12, type='sine', vol=0.14){
  try { const c = ac(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t+dur);
  } catch(e){}
}
const sfx = {
  collect(){ blip(880,.12); setTimeout(()=>blip(1320,.14),70); },
  break_(){ blip(120,.3,'sawtooth',.16); setTimeout(()=>blip(80,.35,'sawtooth',.12),60); },
  restore(){ [392,494,587,784].forEach((f,i)=>setTimeout(()=>blip(f,.25,'sine',.09),i*110)); },
  bell(){ blip(520,1.2,'sine',.16); setTimeout(()=>blip(778,1.0,'sine',.08),30); },
  scan(){ blip(1200,.35,'sine',.06); setTimeout(()=>blip(1500,.3,'sine',.05),120); },
  swap(){ blip(660,.08,'triangle',.1); },
  win(){ [523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>blip(f,.35),i*150)); },
  deny(){ blip(140,.14,'sawtooth',.1); },
  hurt(){ blip(100,.22,'sawtooth',.14); setTimeout(()=>blip(70,.18,'sawtooth',.1),50); },
  contain(){ [660,880,990].forEach((f,i)=>setTimeout(()=>blip(f,.3,'sine',.09),i*90)); },
};

// ============ MUSIC (procedural WebAudio — ambient drone + temple bells, no audio files) ============
const MUS={ mode:'', nodes:[], timer:null, master:null };
function musicStop(){
  MUS.nodes.forEach(n=>{ try{ n.stop(); }catch(e){} try{ n.disconnect(); }catch(e){} });
  if (MUS.master){ try{ MUS.master.disconnect(); }catch(e){} }
  clearInterval(MUS.timer); MUS.timer=null; MUS.nodes=[]; MUS.master=null; MUS.mode='';
}
function musicStart(mode){
  if (MUS.mode===mode) return;
  musicStop();
  try{
    const c=ac();
    const m=c.createGain(); m.gain.setValueAtTime(0.0001, c.currentTime);
    m.gain.exponentialRampToValueAtTime(1.0, c.currentTime+2.5);
    m.connect(c.destination); MUS.master=m;
    const drone=(f,type,vol)=>{
      const o=c.createOscillator(), g=c.createGain();
      o.type=type; o.frequency.value=f; g.gain.value=vol;
      const l=c.createOscillator(), lg=c.createGain();
      l.type='sine'; l.frequency.value=0.07+Math.random()*0.06; lg.gain.value=vol*0.45;
      l.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(m); o.start(); l.start();
      MUS.nodes.push(o,l);
    };
    // audible mids added (laptop/phone speakers 50-110Hz nahi bajaate)
    if (mode==='title'){ drone(82.4,'sine',.07); drone(164.8,'sine',.045); drone(220,'triangle',.022); drone(329.6,'sine',.014); }
    if (mode==='explore'){ drone(55,'sine',.05); drone(110,'sine',.07); drone(220,'sine',.04); drone(330,'triangle',.018); }
    if (mode==='boss'){ drone(49,'sawtooth',.025); drone(98,'sawtooth',.03); drone(146.8,'sine',.055); drone(196,'triangle',.028); drone(293.7,'sine',.016); }
    const scale = mode==='boss' ? [220,261.6,311.1,392,466.2] : [261.6,329.6,392,523.25];
    const step = mode==='boss' ? 900 : (mode==='title' ? 2400 : 1500);
    MUS.timer=setInterval(()=>{
      if (document.hidden) return;
      const f=scale[Math.floor(Math.random()*scale.length)];
      blip(f, mode==='boss'?0.5:1.5, 'sine', mode==='boss'?0.06:0.05);
      if (mode==='boss' && Math.random()<0.5) blip(f/2, 0.3, 'triangle', 0.05);
    }, step);
    MUS.mode=mode;
  }catch(e){}
}

// ============ HEROES (canonical palettes — designs locked) ============
const HEROES = [
  { id:'rudra',  nm:'RUDRA',  init:'R', col:'#ffb347', body:0x16161c, accent:0xffb347, // black/charcoal + golden orange
    abil:'ASTRA BREAK — unstable barrier todta hai', key:'1' },
  { id:'aadhya', nm:'AADHYA', init:'A', col:'#3ee8e0', body:0xe8ecf2, accent:0x3ee8e0, // white jacket + teal prakriti
    abil:'SHAKTI RESTORE — corrupted ko stabilize karta hai', key:'2' },
  { id:'ronit',  nm:'RONIT',  init:'V', col:'#ff4a5a', body:0x1a1216, accent:0xff4a5a, // black-red + vel crimson
    abil:'VEL PRECISION — door ke mechanism ko trigger karta hai', key:'3' },
  { id:'ira',    nm:'IRA',    init:'I', col:'#4a9aff', body:0x182038, accent:0x4ad8ff, // navy-blue + cyan sigils
    abil:'ASTRA SCAN — chhupa hua sab reveal karta hai', key:'4' },
];
let activeHero = 0;

// hero bar UI
const hbar = $('heroes');
HEROES.forEach((h,i)=>{
  const b = document.createElement('div');
  b.className = 'hbtn'; b.id = 'hb-'+i;
  b.innerHTML = `<img src="./assets/portraits/${h.id}.png" alt="${h.nm}"/><div class="hn">${h.nm} [${h.key}]</div>`;
  b.onclick = ()=>switchHero(i);
  hbar.appendChild(b);
});
function refreshHeroBar(){
  HEROES.forEach((h,i)=>{
    const b = $('hb-'+i);
    b.classList.toggle('active', i===activeHero);
    b.style.borderColor = i===activeHero ? h.col : '#4a3c30';
  });
}

// ============ WORLD DATA (2D px logic → 3D xz) ============
const WALLS = [
  [0,0,1400,40],[0,960,1400,40],[0,0,40,1000],[1360,0,40,1000],
  // breach enclosure (dais)
  [560,140,40,260],[800,140,40,260],[560,100,280,40],[560,360,80,36],[760,360,80,36],
  // hidden alcove shell (west)
  [160,200,200,36],[160,364,200,36],[160,200,36,200],[324,200,36,60],[324,340,36,60],
  // barrier row (sides — center is breakable)
  [40,690,560,36],[800,690,560,36],
];
const BARRIER = [600,690,200,36];      // Rudra breaks
const WATER   = [40,520,1320,90];      // channel — solid
const BRIDGE  = [660,520,80,90];       // Aadhya restores → passable
const HIDDEN  = [324,260,36,80];       // Ira reveals → passable
const POOL2   = [1000,380,240,120];    // mech island pool — always solid
const MECH    = { x:1120, y:440 };     // Ronit triggers (after Ira reveals)
const GATE    = [640,360,120,36];      // opens on mech
const DAIS    = { x:700, y:250, r:46 };
const SPARKS_DEF = [ [300,820], [1150,480], [250,300] ];

function rectHit(cx, cy, r, rect){
  const [x,y,w,h]=rect;
  const nx=Math.max(x,Math.min(cx,x+w)), ny=Math.max(y,Math.min(cy,y+h));
  return (cx-nx)**2+(cy-ny)**2 < r*r;
}

// ============ STATE ============
let px=700, py=880, pr=15, faceAngle=Math.PI;
let barrierBroken=false, bridgeOk=false, hiddenOpen=false, mechSeen=false, mechOn=false;
let hiddenA=1; // hidden wall opacity
let sparks=[], got=0, shake=0, startT=0, swaps=0, abilCd=0;
let stability=100, hurtCd=0, contained=0;
let playing=false;

function solidAt(nx, ny){
  for (const w of WALLS) if (rectHit(nx,ny,pr,w)) return true;
  if (!barrierBroken && rectHit(nx,ny,pr,BARRIER)) return true;
  if (!hiddenOpen && rectHit(nx,ny,pr,HIDDEN)) return true;
  if (rectHit(nx,ny,pr,POOL2)) return true;
  if (!mechOn && rectHit(nx,ny,pr,GATE)) return true;
  // water channel: solid except restored bridge zone
  if (rectHit(nx,ny,pr-4,WATER)){
    const inBridge = nx>BRIDGE[0]-pr && nx<BRIDGE[0]+BRIDGE[2]+pr && ny>BRIDGE[1]-pr && ny<BRIDGE[1]+BRIDGE[3]+pr;
    if (!(bridgeOk && inBridge)) return true;
  }
  return false;
}

// ============ THREE SETUP (AAA pipeline) ============
const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.25 : 1.6)); // perf: capped
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
document.body.prepend(renderer.domElement);

const scene3 = new THREE.Scene();
scene3.background = new THREE.Color(0x101614);
scene3.fog = new THREE.FogExp2(0x101614, 0.00062);
const camera = new THREE.PerspectiveCamera(48, innerWidth/innerHeight, 1, 4000);

const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { samples:2, type:THREE.HalfFloatType }); // perf: MSAA 2x
const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene3, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth/2,innerHeight/2), 0.32, 0.4, 0.86); // less glow, more stone
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
// adaptive quality — agar FPS girta hai toh auto-downgrade (atak-atak fix)
let fpsE=60, lowQ=false, perfT=0;
function perfTick(dt){
  if (dt>0.0001) fpsE += (1/dt - fpsE)*0.05;
  perfT += dt;
  if (!lowQ && perfT>6 && fpsE<42){
    lowQ=true;
    renderer.setPixelRatio(1);
    bloomPass.strength=0.5;
    renderer.shadowMap.autoUpdate=false;
    composer.setSize(innerWidth, innerHeight);
  }
}
addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

// ============ ASSET LOADING (Neo-Varanasi art pack + canonical hero sprites) ============
const manager = new THREE.LoadingManager();
function assetsReady(){
  $('b-start').disabled=false;
  $('b-start').textContent='ENTER THE BREACH';
  $('b-tut').disabled=false;
  fixSpriteAspects();
}
manager.onLoad = assetsReady;
manager.onError = (u)=>{ console.warn('asset failed:', u); assetsReady(); };
const texLoader = new THREE.TextureLoader(manager);
function loadTex(url){ const t=texLoader.load(url); t.colorSpace=THREE.SRGBColorSpace; return t; }
const TEX = {
  floor: loadTex('./assets/textures/floor_ghat.jpg'),
  water: loadTex('./assets/textures/water_ganga.jpg'),
  wall:  loadTex('./assets/textures/wall_temple.jpg'),
  sky:   loadTex('./assets/textures/skyline_panorama.jpg'),
};
TEX.floor.wrapS=TEX.floor.wrapT=THREE.RepeatWrapping; TEX.floor.repeat.set(6,4.3);
const SPR={};
['rudra','aadhya','ronit','ira'].forEach(id=>{
  SPR[id+'_idle']=loadTex('./assets/sprites/'+id+'_idle.png');
  SPR[id+'_ability']=loadTex('./assets/sprites/'+id+'_ability.png');
  SPR[id+'_walkA']=loadTex('./assets/sprites/'+id+'_walkA.png');
  SPR[id+'_walkB']=loadTex('./assets/sprites/'+id+'_walkB.png');
});
['drifter','stalker','mimic','abhyas','chhaya'].forEach(id=>{ SPR['c_'+id]=loadTex('./assets/sprites/creature_'+id+'.png'); });
SPR['boss_spirit']=loadTex('./assets/sprites/boss_spirit.png');
const waterTexes=[];
function fixSpriteAspects(){
  heroModels.forEach(g=>{
    const spr=g.getObjectByName('spr');
    if (!spr) return;
    const img=spr.material.map.image;
    if (img && img.width) spr.scale.set(84*img.width/img.height, 84, 1);
  });
  [drifter.g, stalker.g, mimic.g, echoG, echo2G].forEach(g=>{
    const spr=g.getObjectByName('cspr');
    if (!spr) return;
    const img=spr.material.map && spr.material.map.image;
    if (img && img.width) spr.scale.set(spr.userData.h*img.width/img.height, spr.userData.h, 1);
  });
  { const img=bossSpirit.material.map && bossSpirit.material.map.image;
    if (img && img.width) bossSpirit.scale.set(250*img.width/img.height, 250, 1); }
}

// lights
scene3.add(new THREE.HemisphereLight(0x8aa8a4, 0x1a2824, 0.7));
const moon = new THREE.DirectionalLight(0xd8efe8, 0.55);
moon.position.set(400, 900, 300); moon.castShadow = true;
moon.shadow.mapSize.set(isTouch?1024:2048, isTouch?1024:2048);
moon.shadow.camera.left=-900; moon.shadow.camera.right=900;
moon.shadow.camera.top=900; moon.shadow.camera.bottom=-900;
moon.shadow.camera.far=2500; moon.shadow.bias=-0.0006;
scene3.add(moon);
moon.target.position.set(700,0,500); scene3.add(moon.target);
const breachLight = new THREE.PointLight(0xc44536, 22000, 320);
breachLight.position.set(700, 120, 250); scene3.add(breachLight);

// floor — painted ghat-stone (carved tiles, moss, neon puddles)
const floor = new THREE.Mesh(new THREE.PlaneGeometry(1400,1000),
  new THREE.MeshStandardMaterial({ map:TEX.floor, color:0x8a9a96, roughness:0.92, metalness:0.02 }));
floor.rotation.x=-Math.PI/2; floor.position.set(700,0,500); floor.receiveShadow=true;
scene3.add(floor);

// NEO-VARANASI skyline backdrop (north — hamesha visible, fog-proof)
const skyline = new THREE.Mesh(new THREE.PlaneGeometry(3200,800),
  new THREE.MeshBasicMaterial({ map:TEX.sky, fog:false }));
skyline.position.set(700, 250, -170);
scene3.add(skyline);

// LIVING YANTRA — rotating glowing rings around the dais (Option C!)
const yantraRings = [];
[[70,0xc44536,0.72],[100,0x3ee8e0,0.5],[135,0xc45a78,0.38]].forEach(([r,col,op],i)=>{
  const ring = new THREE.Mesh(new THREE.RingGeometry(r-3,r,64),
    new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:op, side:THREE.DoubleSide }));
  ring.rotation.x=-Math.PI/2; ring.position.set(DAIS.x,1.5+i*0.4,DAIS.y);
  scene3.add(ring); yantraRings.push(ring);
});
// dais
const dais = new THREE.Mesh(new THREE.CylinderGeometry(DAIS.r,DAIS.r+6,14,32),
  new THREE.MeshStandardMaterial({ color:0x4a3c34, emissive:0xc44536, emissiveIntensity:0.12, roughness:0.7 }));
dais.position.set(DAIS.x,7,DAIS.y); dais.receiveShadow=true; scene3.add(dais);
// dais kamal — gold gem nahi. Amrit-drop hi color badalta hai.
const crystal = buildKamal();
crystal.scale.set(2.3,2.3,2.3);
crystal.position.set(DAIS.x, 70, DAIS.y); scene3.add(crystal);
const crystalDrop = crystal.children[8];

// GUARDIAN STATUE behind dais (Option B — ab Milestone D mein JAAGTA hai)
let guardian, guardFace, guardCore;
{
  const sg = new THREE.Group();
  const smat = new THREE.MeshStandardMaterial({ color:0x4a433c, roughness:0.88, metalness:0.04 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(42,58,130,10), smat); torso.position.y=160; sg.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(30,12,10), smat); head.position.y=250; sg.add(head);
  // hollow face glow
  const face = new THREE.Mesh(new THREE.SphereGeometry(16,10,8),
    new THREE.MeshStandardMaterial({ color:0x1a1210, emissive:0xc44536, emissiveIntensity:1.2 }));
  face.position.set(0,250,24); sg.add(face); guardFace=face;
  // bell core in ribcage
  const bell = new THREE.Mesh(new THREE.ConeGeometry(20,30,12),
    new THREE.MeshStandardMaterial({ color:0x5a3028, emissive:0xc44536, emissiveIntensity:1.3 }));
  bell.position.set(0,150,30); sg.add(bell); guardCore=bell;
  // vine arm
  const vine = new THREE.Mesh(new THREE.CapsuleGeometry(10,90,4,8),
    new THREE.MeshStandardMaterial({ color:0x1a4a3a, emissive:0x3ee8a0, emissiveIntensity:0.7 }));
  vine.position.set(-62,160,10); vine.rotation.z=0.5; sg.add(vine);
  sg.position.set(DAIS.x, 0, DAIS.y-140);
  sg.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  scene3.add(sg); guardian=sg;
}
// GUARDIAN ka REAL FORM — water-spirit colossus (boss entry pe statue se uthta hai)
const bossSpiritG=new THREE.Group();
const bossSpirit=new THREE.Sprite(new THREE.SpriteMaterial({ map:SPR['boss_spirit'], transparent:true, opacity:0, depthWrite:false }));
bossSpirit.center.set(0.5,0); bossSpirit.scale.set(250,250,1);
bossSpiritG.add(bossSpirit);
bossSpiritG.position.set(DAIS.x, 0, DAIS.y-155);
bossSpiritG.visible=false; scene3.add(bossSpiritG);
let bossRise=0, bossRevealPend=false;
// BOSS ATTACKS — shockwave rings (Living Yantra pulse) + vine eruptions
let atkT=0;
const shock={ on:false, r:0, hit:false };
const shockMesh=new THREE.Mesh(new THREE.RingGeometry(0.955,1,64),
  new THREE.MeshBasicMaterial({ color:0xc44536, transparent:true, opacity:0, side:THREE.DoubleSide }));
shockMesh.rotation.x=-Math.PI/2; shockMesh.position.y=3; scene3.add(shockMesh);
const tel={ on:false, x:0, y:0, t:0, cd:3.2 };
const telMesh=new THREE.Mesh(new THREE.RingGeometry(58,70,40),
  new THREE.MeshBasicMaterial({ color:0xff4a5a, transparent:true, opacity:0, side:THREE.DoubleSide }));
telMesh.rotation.x=-Math.PI/2; telMesh.position.y=2.5; scene3.add(telMesh);

// walls — carved temple stone (deity niches + bells + neon strip)
const WALL_H = 54;
function rc(rect){ return { cx:rect[0]+rect[2]/2, cz:rect[1]+rect[3]/2, w:rect[2], d:rect[3] }; }
for (const w of WALLS){
  const {cx,cz,w:ww,d} = rc(w);
  const wt=TEX.wall.clone(); wt.needsUpdate=true;
  wt.wrapS=wt.wrapT=THREE.RepeatWrapping;
  wt.repeat.set(Math.max(1,Math.round(Math.max(ww,d)/200)),1);
  const m = new THREE.Mesh(new THREE.BoxGeometry(ww,WALL_H,d),
    new THREE.MeshStandardMaterial({ map:wt, color:0x9aa8a4, roughness:0.88, metalness:0.02, emissive:0x102018, emissiveIntensity:0.04 }));
  m.position.set(cx,WALL_H/2,cz); m.castShadow=true; m.receiveShadow=true; scene3.add(m);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(ww+2,2.5,d+2),
    new THREE.MeshBasicMaterial({ color:0xc44536, transparent:true, opacity:0.22 }));
  trim.position.set(cx,WALL_H+1,cz); scene3.add(trim);
}
// barrier (cracked — sindoor fissures)
let barrierMesh;
{
  const {cx,cz,w:ww,d} = rc(BARRIER);
  barrierMesh = new THREE.Mesh(new THREE.BoxGeometry(ww,WALL_H,d),
    new THREE.MeshStandardMaterial({ color:0x3a302c, roughness:0.72, emissive:0xc44536, emissiveIntensity:0.42 }));
  barrierMesh.position.set(cx,WALL_H/2,cz); barrierMesh.castShadow=true; scene3.add(barrierMesh);
}
// hidden wall
let hiddenMesh;
{
  const {cx,cz,w:ww,d} = rc(HIDDEN);
  hiddenMesh = new THREE.Mesh(new THREE.BoxGeometry(ww,WALL_H,d),
    new THREE.MeshStandardMaterial({ color:0x3a342c, roughness:0.72, transparent:true, opacity:1, emissive:0x3ee8e0, emissiveIntensity:0 }));
  hiddenMesh.position.set(cx,WALL_H/2,cz); scene3.add(hiddenMesh);
}
// water — glowing cyber-Ganga (tairte marigold petals, animated flow)
for (const wrect of [WATER, POOL2]){
  const {cx,cz,w:ww,d} = rc(wrect);
  const wtx=TEX.water.clone(); wtx.needsUpdate=true;
  wtx.wrapS=wtx.wrapT=THREE.RepeatWrapping;
  wtx.repeat.set(Math.max(1,ww/320), Math.max(0.5,d/320));
  waterTexes.push(wtx);
  const wm = new THREE.Mesh(new THREE.BoxGeometry(ww,6,d),
    new THREE.MeshStandardMaterial({ map:wtx, color:0x8fb8b0, emissive:0x123c40, emissiveIntensity:0.18, roughness:0.28, metalness:0.22 }));
  wm.position.set(cx,2,cz); scene3.add(wm);
}
// bridge (corrupted vines → restored)
let bridgeMesh;
{
  const {cx,cz,w:ww,d} = rc(BRIDGE);
  bridgeMesh = new THREE.Mesh(new THREE.BoxGeometry(ww,10,d),
    new THREE.MeshStandardMaterial({ color:0x1c3028, emissive:0xff4a5a, emissiveIntensity:0.6, roughness:0.6 }));
  bridgeMesh.position.set(cx,4,cz); scene3.add(bridgeMesh);
}
// mech (bell on pillar — hidden until Ira scans)
let mechGroup;
{
  mechGroup = new THREE.Group();
  const pil = new THREE.Mesh(new THREE.CylinderGeometry(12,16,50,10),
    new THREE.MeshStandardMaterial({ color:0x4e463c, roughness:0.84 }));
  pil.position.y=25; mechGroup.add(pil);
  const bell = new THREE.Mesh(new THREE.ConeGeometry(14,20,12),
    new THREE.MeshStandardMaterial({ color:0x7a5a2a, emissive:0xff8830, emissiveIntensity:0.3 }));
  bell.position.y=60; bell.name='bell'; mechGroup.add(bell);
  mechGroup.position.set(MECH.x,0,MECH.y);
  mechGroup.visible = true; // visible but un-targetable until scanned (marker shows after scan)
  scene3.add(mechGroup);
}
// gate bars
const gateGroup = new THREE.Group();
{
  const {cx,cz,w:ww} = rc(GATE);
  const bmat = new THREE.MeshStandardMaterial({ color:0x401016, emissive:0xff4a3a, emissiveIntensity:1.5 });
  for (let i=0;i<5;i++){
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(3.6,3.6,WALL_H,8), bmat);
    bar.position.set(GATE[0]+16+i*(ww-32)/4, WALL_H/2, cz);
    gateGroup.add(bar);
  }
  scene3.add(gateGroup);
}
// KAMAL — amrit ka lotus. Gold gem nahi; restoration ka mythic pickup.
function buildKamal(){
  const g=new THREE.Group();
  const petal=new THREE.MeshStandardMaterial({ color:0xf6d5de, emissive:0xc45a78, emissiveIntensity:0.45, roughness:0.42 });
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2;
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(5.5,8,6), petal);
    leaf.scale.set(0.42,0.16,1.25);
    leaf.position.set(Math.cos(a)*7.5, 0.6, Math.sin(a)*7.5);
    leaf.rotation.set(1.05, -a, 0);
    g.add(leaf);
  }
  const drop=new THREE.Mesh(new THREE.SphereGeometry(2.8,12,10),
    new THREE.MeshStandardMaterial({ color:0xf7fff8, emissive:0xc8ffe6, emissiveIntensity:1.8, roughness:0.12 }));
  drop.position.y=2.2; g.add(drop);
  const cup=new THREE.Mesh(new THREE.TorusGeometry(4.2,0.45,6,16),
    new THREE.MeshStandardMaterial({ color:0xc45a3a, emissive:0xff6a3a, emissiveIntensity:0.35, roughness:0.4 }));
  cup.rotation.x=Math.PI/2; cup.position.y=0.3; g.add(cup);
  return g;
}
const sparkMeshes=[];
for (const [sx,sy] of SPARKS_DEF){
  const m=buildKamal();
  m.position.set(sx,26,sy); scene3.add(m);
  sparkMeshes.push(m);
}
// scan ring (Ira)
const scanRing = new THREE.Mesh(new THREE.RingGeometry(1,1.03,64),
  new THREE.MeshBasicMaterial({ color:0x4ad8ff, transparent:true, opacity:0, side:THREE.DoubleSide }));
scanRing.rotation.x=-Math.PI/2; scanRing.position.y=2.5; scene3.add(scanRing);
let scanT = -1;
// ASTRA DRISHTI (world-vision) + RESONANCE combo
let drishtiT=0, slowT=0, resonT=0, resonCount=0, drishtiGlow=false;
const CCOL={ drifter:0x9adfff, stalker:0x3ee8a0, mimic:0xff4a5a };
function startDrishti(){
  drishtiT=8; slowT=0.55; resonT=3;
  $('drishti').classList.add('on');
  toastHint(LB('ASTRA DRISHTI — the world reveals its counters! ⚡ 3s RESONANCE window!','ASTRA DRISHTI — duniya apne counters dikha rahi hai! ⚡ 3s RESONANCE window!'), 2600);
}
function resonanceHit(){
  if (resonT<=0) return;
  resonT=0; resonCount++;
  stability=Math.min(100, stability+4); updateStabHud();
  flashFX('rgba(255,217,138,.55)', 380); shake=10; sfx.collect();
  toastHint('⚡ RESONANCE HIT! +4 STABILITY · ×'+resonCount, 2600);
}
// vel projectile (Ronit)
const velMesh = new THREE.Mesh(new THREE.ConeGeometry(4,22,8),
  new THREE.MeshStandardMaterial({ color:0x6a1420, emissive:0xff4a5a, emissiveIntensity:2.5 }));
velMesh.visible=false; scene3.add(velMesh);
let velAnim = null;

// ============ TUTORIAL — ABHYAS-PRET (Ira ka hologram training echo, naya training villain) ============
const echoG = new THREE.Group();
{
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(22,1),
    new THREE.MeshStandardMaterial({ color:0x3ee8e0, emissive:0x3ee8e0, emissiveIntensity:1.4, wireframe:true, transparent:true, opacity:0.85 }));
  shell.name='shell'; shell.visible=false; echoG.add(shell);
  const ecore = new THREE.Mesh(new THREE.SphereGeometry(9,16,16),
    new THREE.MeshStandardMaterial({ color:0x101024, emissive:0x9adfff, emissiveIntensity:2.2, transparent:true, opacity:0.95 }));
  ecore.name='ecore'; ecore.visible=false; echoG.add(ecore);
  const ering = new THREE.Mesh(new THREE.TorusGeometry(46,1.5,8,48),
    new THREE.MeshBasicMaterial({ color:0x3ee8e0, transparent:true, opacity:0.55 }));
  ering.rotation.x=Math.PI/2; ering.position.y=1.6; ering.name='ering'; echoG.add(ering);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(18,24),
    new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.38, depthWrite:false }));
  blob.rotation.x=-Math.PI/2; blob.position.y=1.15; echoG.add(blob);
  const abMat=new THREE.SpriteMaterial({ map:SPR['c_abhyas'], transparent:true });
  const abSpr=new THREE.Sprite(abMat);
  abSpr.center.set(0.5,0); abSpr.position.y=1.2; abSpr.name='cspr'; abSpr.userData.h=104;
  abSpr.scale.set(116,104,1); echoG.add(abSpr);
}
echoG.visible=false; scene3.add(echoG);
// CHHAYA-PRET — doosra training villain (dark, door bhaagta hai)
const echo2G = new THREE.Group();
{
  const shell2 = new THREE.Mesh(new THREE.OctahedronGeometry(24,0),
    new THREE.MeshStandardMaterial({ color:0xb86bff, emissive:0x8a5aff, emissiveIntensity:1.5, wireframe:true, transparent:true, opacity:0.85 }));
  shell2.name='shell'; shell2.visible=false; echo2G.add(shell2);
  const ecore2 = new THREE.Mesh(new THREE.SphereGeometry(9,16,16),
    new THREE.MeshStandardMaterial({ color:0x180a24, emissive:0xff4a5a, emissiveIntensity:2.2, transparent:true, opacity:0.95 }));
  ecore2.name='ecore'; ecore2.visible=false; echo2G.add(ecore2);
  const cspr=new THREE.Sprite(new THREE.SpriteMaterial({ map:SPR['c_chhaya'], transparent:true }));
  cspr.center.set(0.5,0.5); cspr.name='cspr'; cspr.userData.h=76; cspr.scale.set(136,76,1); echo2G.add(cspr);
}
echo2G.visible=false; scene3.add(echo2G);
const echo2Mark=new THREE.Mesh(new THREE.RingGeometry(16,22,40),
  new THREE.MeshBasicMaterial({ color:0xb86bff, transparent:true, opacity:0.8, side:THREE.DoubleSide, depthWrite:false }));
echo2Mark.rotation.x=-Math.PI/2; echo2Mark.visible=false; scene3.add(echo2Mark);
let tutOn=false, tutStep=0, tutT=0, tutMove=0, tutSwapBase=0;
const echo={ x:700, y:745, mode:'idle' };
const echo2={ x:985, y:845, mode:'idle' };
function echoCoreColor(hex){
  echoG.getObjectByName('ecore').material.emissive.setHex(hex);
  const ring=echoG.getObjectByName('ering'); if(ring) ring.material.color.setHex(hex);
}
function echo2CoreColor(hex){
  const core=echo2G.getObjectByName('ecore'); if(core) core.material.emissive.setHex(hex);
  const spr=echo2G.getObjectByName('cspr'); if(spr) spr.material.color.setHex(hex===0xffb347?0xffd9a8:0xffffff);
  echo2Mark.material.color.setHex(hex);
}
function tutMsg(main, hint){ $('objective').textContent=main; if (hint!==undefined) toastHint(hint, 4600); }
// mech marker (after scan)
const mechMark = new THREE.Mesh(new THREE.RingGeometry(22,26,32),
  new THREE.MeshBasicMaterial({ color:0x4ad8ff, transparent:true, opacity:0, side:THREE.DoubleSide }));
mechMark.rotation.x=-Math.PI/2; mechMark.position.set(MECH.x,3,MECH.y); scene3.add(mechMark);

// AADHYA vines FX — attack pe zameen se belein phootti hain
const vinesFX=[];
function vineFX(x,y){
  const g=new THREE.Group();
  for (let i=0;i<10;i++){
    const h=28+Math.random()*36;
    const m=new THREE.Mesh(new THREE.ConeGeometry(3.5+Math.random()*3, h, 6),
      new THREE.MeshStandardMaterial({ color:0x1a7a4a, emissive:0x3ee8a0, emissiveIntensity:1.7, transparent:true, opacity:0.95 }));
    const a=Math.random()*Math.PI*2, r=12+Math.random()*36;
    m.position.set(Math.cos(a)*r, h/2, Math.sin(a)*r);
    m.rotation.set((Math.random()-.5)*0.6, Math.random()*Math.PI, (Math.random()-.5)*0.6);
    g.add(m);
  }
  g.position.set(x,0,y); g.scale.y=0.02;
  scene3.add(g); vinesFX.push({g,t:0});
}
// particles
const MAXP=500;
const pGeo=new THREE.BufferGeometry();
const pPos=new Float32Array(MAXP*3), pVel=new Float32Array(MAXP*3), pLife=new Float32Array(MAXP), pCol=new Float32Array(MAXP*3);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol,3));
const pPts=new THREE.Points(pGeo, new THREE.PointsMaterial({ size:7, vertexColors:true, transparent:true, opacity:0.95, depthWrite:false, blending:THREE.AdditiveBlending }));
pPts.frustumCulled=false; scene3.add(pPts);
let pHead=0;
function flashFX(col='rgba(255,217,138,.6)', dur=200){
  const f=$('flash'); if(!f) return;
  f.style.background=col; f.style.transition='none'; f.style.opacity='1';
  requestAnimationFrame(()=>{ f.style.transition='opacity '+dur+'ms ease-out'; f.style.opacity='0'; });
}
function burst(x,z,colHex,n=24,y=22){
  const c=new THREE.Color(colHex);
  for(let i=0;i<n;i++){
    const j=pHead=(pHead+1)%MAXP;
    pPos[j*3]=x; pPos[j*3+1]=y; pPos[j*3+2]=z;
    pVel[j*3]=(Math.random()-.5)*230; pVel[j*3+1]=Math.random()*190; pVel[j*3+2]=(Math.random()-.5)*230;
    pLife[j]=0.9+Math.random()*0.4;
    pCol[j*3]=c.r; pCol[j*3+1]=c.g; pCol[j*3+2]=c.b;
  }
}

// ============ HYBRID CREATURES (Monster Mash — har creature 2 traits ka mash, har ek ka counter-hero) ============
function lockEmissives(g){ g.traverse(o=>{ if(o.isMesh && o.material && o.material.emissive){ o.userData.e0=o.material.emissive.getHex(); o.userData.i0=o.material.emissiveIntensity; } }); }
function restoreEmissives(g){ g.traverse(o=>{ if(o.isMesh && o.userData.e0!==undefined){ o.material.emissive.setHex(o.userData.e0); o.material.emissiveIntensity=o.userData.i0; } }); }
function calmEmissives(g){ g.traverse(o=>{ if(o.isMesh && o.userData.e0!==undefined){ o.material.emissive.setHex(0x9adfff); o.material.emissiveIntensity=0.7; } }); }

// Painted creature billboards (concept-art sprites — villain glow-up)
function buildCreatureBillboard(sprKey, h, glowCol, glowR){
  const g=new THREE.Group();
  const blob=new THREE.Mesh(new THREE.CircleGeometry(16,24),
    new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.42, depthWrite:false }));
  blob.rotation.x=-Math.PI/2; blob.position.y=1.2; g.add(blob);
  const glow=new THREE.Mesh(new THREE.CircleGeometry(glowR,40),
    new THREE.MeshBasicMaterial({ color:glowCol, transparent:true, opacity:0.07, side:THREE.DoubleSide, depthWrite:false }));
  glow.rotation.x=-Math.PI/2; glow.position.y=1.4; glow.name='glow'; g.add(glow);
  const mat=new THREE.SpriteMaterial({ map:SPR[sprKey], transparent:true });
  const spr=new THREE.Sprite(mat);
  spr.center.set(0.5,0); spr.position.y=2; spr.name='cspr'; spr.userData.h=h;
  spr.scale.set(h,h,1); g.add(spr);
  scene3.add(g); return g;
}
// 1) LANTERN-EYED DRIFTER (lantern × ghost) — counter: IRA SCAN
function buildDrifter(){ return buildCreatureBillboard('c_drifter', 95, 0xffc86a, 150); }
// 2) CLAW-VINE STALKER (claw × vine) — counter: AADHYA RESTORE
function buildStalker(){ return buildCreatureBillboard('c_stalker', 72, 0xff4a5a, 120); }
// 3) ECHO-BELL MIMIC (bell × mimic) — counter: RONIT VEL (door se!)
function buildMimicFake(){
  const g=new THREE.Group();
  const m=buildKamal();
  m.position.y=26; g.add(m);
  lockEmissives(g); scene3.add(g); return g;
}
function buildMimicTrue(){
  const g=buildCreatureBillboard('c_mimic', 80, 0xffb347, 120);
  g.visible=false; return g;
}
const echoRing=new THREE.Mesh(new THREE.RingGeometry(0.94,1,48),
  new THREE.MeshBasicMaterial({ color:0xffc86a, transparent:true, opacity:0, side:THREE.DoubleSide }));
echoRing.rotation.x=-Math.PI/2; echoRing.position.y=2; scene3.add(echoRing);

const CREATURE_INFO={
  drifter:{ nm:'LANTERN-EYED DRIFTER', mash:'lantern × ghost', counter:['IRA [4] — her SCAN will calm it','IRA [4] ka SCAN isse shaant karega'] },
  stalker:{ nm:'CLAW-VINE STALKER', mash:'claw × vine', counter:['AADHYA [2] — get close and RESTORE','AADHYA [2] paas jaake RESTORE kare'] },
  mimic:{ nm:'ECHO-BELL MIMIC', mash:'bell × mimic', counter:['RONIT [3] — throw VEL from a distance','RONIT [3] door se VEL phenke'] },
};
const drifter={ id:'drifter', g:buildDrifter(), x:450,y:800, home:[[430,795],[950,805]], wi:0, cr:20, dmg:14, state:'roam', met:false };
const stalker={ id:'stalker', g:buildStalker(), x:500,y:652, home:[[480,650],[900,655]], wi:0, cr:18, dmg:16, state:'roam', met:false };
const mimic={ id:'mimic', gFake:buildMimicFake(), g:buildMimicTrue(), x:1080,y:830, cr:18, dmg:12, state:'disguised', pulseT:0, ringR:-1, met:false };

function updateStabHud(){
  const s=$('stab');
  s.textContent=`STABILITY ${stability}%`;
  s.style.color = stability>60?'#7dffb0':stability>30?'#ffd98a':'#ff6a7a';
}
function hurt(dmg,fx,fz){
  if (hurtCd>0 || !playing) return;
  hurtCd=1.0; stability=Math.max(0,stability-dmg);
  shake=13; sfx.hurt(); burst(px,py,0xff4a5a,22,26);
  flashFX('rgba(255,74,90,.5)', 260);
  const d=Math.hypot(px-fx,py-fz)||1;
  const nx=px+(px-fx)/d*55, ny=py+(py-fz)/d*55;
  if (!solidAt(nx,py)) px=nx;
  if (!solidAt(px,ny)) py=ny;
  updateStabHud();
  if (stability<=0) endRun(false);
}
function worsenStalker(){
  stalker.rage=(stalker.rage||0)+1;
  stalker.dmg=Math.min(28, 16+stalker.rage*4);
  const spr=stalker.g.getObjectByName('cspr');
  if (spr){
    const sc=72*(1+stalker.rage*0.22);
    spr.scale.set(sc,sc,1);
    spr.material.color.setHex(0xff4a5a);
    spr.material.opacity=1;
  }
  const glow=stalker.g.getObjectByName('glow');
  if (glow){
    glow.visible=true;
    glow.material.color.setHex(0xff2a3a);
    glow.material.opacity=Math.min(0.34, 0.1+stalker.rage*0.07);
    glow.scale.set(1+stalker.rage*0.28, 1+stalker.rage*0.28, 1);
  }
  burst(stalker.x,stalker.y,0xff4a5a,32,34);
}
function containCreature(c){
  if (c.state==='contained') return;
  c.state='contained'; contained++;
  calmEmissives(c.g);
  const cs=c.g.getObjectByName('cspr');
  const glow=c.g.getObjectByName('glow');
  if (c.id==='stalker'){
    if (cs){ cs.scale.set(60,60,1); cs.material.color.setHex(0x8ee08a); cs.material.opacity=1; }
    if (glow){ glow.visible=true; glow.material.color.setHex(0x3ee8a0); glow.material.opacity=0.2; glow.scale.set(1.1,1.1,1); }
    vineFX(c.x,c.y);
    flashFX('rgba(62,232,160,.4)', 320);
    burst(c.x,c.y,0x3ee8a0,36,30);
  } else {
    if (cs){ cs.material.color.setHex(0x9adfff); cs.material.opacity=0.5; }
    if (glow) glow.visible=false;
    flashFX('rgba(154,223,255,.45)', 300);
    burst(c.x,c.y,0x9adfff,36,30);
  }
  shake=7; sfx.contain();
  if (c.id!=='drifter') resonanceHit();
  $('patterns').textContent=`◈ ${contained} / 3`;
  if (c.id==='stalker') toastHint(LB('LEAVES — the claws gave the shape back.','PATTE — panjon ne shape lautayi.'), 2800);
  else toastHint(CREATURE_INFO[c.id].nm+L(' CONTAINED — the pattern is calm ✦',' CONTAINED — pattern shaant ho gaya ✦'), 2800);
}
function meetCreature(c){
  if (c.met) return; c.met=true;
  const inf=CREATURE_INFO[c.id];
  toastHint(inf.nm+' ('+inf.mash+')\n'+LBa(inf.counter), 3600);
}
function updateCreatures(dt,t){
  // DRIFTER — lantern glow mein aaye toh peecha karta hai
  if (drifter.state!=='contained'){
    const d=Math.hypot(px-drifter.x,py-drifter.y)||1;
    if (d<170){ meetCreature(drifter);
      drifter.x+=(px-drifter.x)/d*82*dt; drifter.y+=(py-drifter.y)/d*82*dt;
    } else {
      const wp=drifter.home[drifter.wi];
      const dd=Math.hypot(wp[0]-drifter.x,wp[1]-drifter.y);
      if (dd<12) drifter.wi=(drifter.wi+1)%drifter.home.length;
      else { drifter.x+=(wp[0]-drifter.x)/dd*46*dt; drifter.y+=(wp[1]-drifter.y)/dd*46*dt; }
    }
    if (d<pr+drifter.cr) hurt(drifter.dmg, drifter.x, drifter.y);
    drifter.g.rotation.y=Math.atan2(px-drifter.x, py-drifter.y);
  }
  drifter.g.position.set(drifter.x, 6+Math.sin(t*2.1)*5, drifter.y);

  // STALKER — bridge strip ka guard, lunge karta hai (strip ke bahar nahi ja sakta)
  if (stalker.state!=='contained'){
    const d=Math.hypot(px-stalker.x,py-stalker.y)||1;
    if (d<150){ meetCreature(stalker);
      stalker.x=Math.min(940,Math.max(460,stalker.x+(px-stalker.x)/d*190*dt));
      stalker.y=Math.min(676,Math.max(624,stalker.y+(py-stalker.y)/d*190*dt));
    } else {
      const wp=stalker.home[stalker.wi];
      const dd=Math.hypot(wp[0]-stalker.x,wp[1]-stalker.y);
      if (dd<12) stalker.wi=(stalker.wi+1)%stalker.home.length;
      else { stalker.x+=(wp[0]-stalker.x)/dd*68*dt; stalker.y+=(wp[1]-stalker.y)/dd*68*dt; }
    }
    if (d<pr+stalker.cr) hurt(stalker.dmg, stalker.x, stalker.y);
    stalker.g.position.set(stalker.x, Math.abs(Math.sin(t*9))*2, stalker.y);
    stalker.g.rotation.y=Math.atan2(px-stalker.x, py-stalker.y);
  } else {
    stalker.g.position.set(stalker.x, 0, stalker.y);
  }

  // MIMIC — nakli Kamal; paas jao toh asli roop + echo rings
  if (mimic.state==='disguised'){
    mimic.gFake.position.set(mimic.x, Math.sin(t*2+1)*5, mimic.y);
    mimic.gFake.rotation.y=t*1.6;
    if (Math.hypot(px-mimic.x,py-mimic.y)<70){
      mimic.state='revealed'; mimic.gFake.visible=false; mimic.g.visible=true;
      sfx.bell(); shake=10; meetCreature(mimic);
      burst(mimic.x,mimic.y,0xffc86a,30,26);
    }
  } else if (mimic.state==='revealed'){
    mimic.g.position.set(mimic.x, Math.abs(Math.sin(t*6))*3, mimic.y);
    mimic.g.rotation.z=Math.sin(t*10)*0.08;
    mimic.pulseT+=dt;
    if (mimic.pulseT>2.4 && mimic.ringR<0){ mimic.pulseT=0; mimic.ringR=12; blip(420,.5,'sine',.1); }
    if (mimic.ringR>=0){
      mimic.ringR+=150*dt;
      echoRing.position.x=mimic.x; echoRing.position.z=mimic.y;
      echoRing.scale.set(mimic.ringR,mimic.ringR,1);
      echoRing.material.opacity=Math.max(0,0.6-mimic.ringR/320);
      const d=Math.hypot(px-mimic.x,py-mimic.y);
      if (Math.abs(d-mimic.ringR)<15 && mimic.ringR>36) hurt(mimic.dmg, mimic.x, mimic.y);
      if (mimic.ringR>190){ mimic.ringR=-1; echoRing.material.opacity=0; }
    }
  } else {
    mimic.g.position.set(mimic.x, 2+Math.sin(t*1.4)*2, mimic.y);
    echoRing.material.opacity=0;
  }
}

// ============ MILESTONE D — DROWNED GUARDIAN OF THE LIVING YANTRA (boss) ============
const CORE_POS={ x:700, y:160 };
let bossOn=false, bossDone=false, bossLock=false, bossRound=0, wave=null, coreOpen=0, finaleT=-1, finaleStep=0;
let bossOrder=[];
const abilityUse={ rudra:0, aadhya:0, ronit:0, ira:0 };
const YOP=[0.9,0.55,0.4];

// swarm-wisps (DRIFTER pattern)
const wisps=[];
for (let i=0;i<3;i++){
  const g=new THREE.Group();
  const s=new THREE.Mesh(new THREE.SphereGeometry(8,10,8),
    new THREE.MeshStandardMaterial({ color:0x3a2a14, emissive:0xffc86a, emissiveIntensity:2 }));
  s.position.y=34; g.add(s);
  const veil=new THREE.Mesh(new THREE.ConeGeometry(10,20,8,1,true),
    new THREE.MeshStandardMaterial({ color:0x245e66, transparent:true, opacity:0.35, emissive:0x3ee8e0, emissiveIntensity:0.25, side:THREE.DoubleSide }));
  veil.position.y=20; veil.rotation.x=Math.PI; g.add(veil);
  g.visible=false; scene3.add(g);
  wisps.push({ g, x:700, y:250, alive:false });
}
// vine strips (VINE pattern)
const vineStrips=[180,230,280,330].map((ry,i)=>{
  const tele=new THREE.Mesh(new THREE.PlaneGeometry(200,26),
    new THREE.MeshBasicMaterial({ color:0xff4a5a, transparent:true, opacity:0, side:THREE.DoubleSide }));
  tele.rotation.x=-Math.PI/2; tele.position.set(700,1.6,ry); scene3.add(tele);
  const spikes=new THREE.Group();
  for (let k=0;k<8;k++){
    const sp=new THREE.Mesh(new THREE.ConeGeometry(5,24,6),
      new THREE.MeshStandardMaterial({ color:0x1a4a3a, emissive:0xff4a5a, emissiveIntensity:1.3 }));
    sp.position.set(610+k*26,12,ry); spikes.add(sp);
  }
  spikes.visible=false; scene3.add(spikes);
  return { ry, tele, spikes, mode:0, t:-i*0.8 };
});
// boss echo rings (BELL pattern)
const bossRings=[0,1].map(()=>{
  const r=new THREE.Mesh(new THREE.RingGeometry(0.94,1,48),
    new THREE.MeshBasicMaterial({ color:0xffc86a, transparent:true, opacity:0, side:THREE.DoubleSide }));
  r.rotation.x=-Math.PI/2; r.position.set(700,2.2,250); scene3.add(r);
  return { m:r, R:-1 };
});
// SHADOW-MASH (climax twist — player ka apna playstyle, dark evil spirit version)
const shadowG=new THREE.Group();
{
  const aura=new THREE.Mesh(new THREE.CircleGeometry(60,40),
    new THREE.MeshBasicMaterial({ color:0x8a1030, transparent:true, opacity:0.16, side:THREE.DoubleSide, depthWrite:false }));
  aura.rotation.x=-Math.PI/2; aura.position.y=1.3; aura.name='saura'; shadowG.add(aura);
  const blob=new THREE.Mesh(new THREE.CircleGeometry(15,24),
    new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.5, depthWrite:false }));
  blob.rotation.x=-Math.PI/2; blob.position.y=1.5; shadowG.add(blob);
  const smat=new THREE.SpriteMaterial({ transparent:true, color:0x2a1535, opacity:0.92 });
  const sspr=new THREE.Sprite(smat);
  sspr.center.set(0.5,0); sspr.position.y=2; sspr.name='sspr'; sspr.scale.set(84,84,1);
  shadowG.add(sspr);
}
const shadowRing=new THREE.Mesh(new THREE.TorusGeometry(16,1.8,8,32),
  new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0xffffff, emissiveIntensity:2 }));
shadowRing.rotation.x=Math.PI/2; shadowRing.position.y=3; shadowG.add(shadowRing);
shadowG.visible=false; scene3.add(shadowG);
const shadow={ x:700, y:200, on:false, most:'rudra', least:'ira', hp:3, stun:0 };
// core marker + finale diyas
const coreMark=new THREE.Mesh(new THREE.RingGeometry(26,32,36),
  new THREE.MeshBasicMaterial({ color:0xffb347, transparent:true, opacity:0, side:THREE.DoubleSide }));
coreMark.rotation.x=-Math.PI/2; coreMark.position.set(CORE_POS.x,2.8,CORE_POS.y); scene3.add(coreMark);
const diyas=[];
for (let i=0;i<10;i++){
  const a=i/10*Math.PI*2;
  const d=new THREE.Mesh(new THREE.SphereGeometry(4,8,8),
    new THREE.MeshStandardMaterial({ color:0x241c10, emissive:0xff9830, emissiveIntensity:0 }));
  d.position.set(DAIS.x+Math.cos(a)*120, 6, DAIS.y+Math.sin(a)*120);
  scene3.add(d); diyas.push(d);
}

const PATTERN_INFO={
  drifter:{ nm:'DRIFTER PATTERN', counter:['IRA [4] — SCAN again to calm the wisps','IRA [4] — dobara SCAN karke wisps shaant karo'] },
  vine:{ nm:'VINE PATTERN', counter:['AADHYA [2] — RESTORE to calm the ground','AADHYA [2] — RESTORE se zameen shaant karo'] },
  bell:{ nm:'BELL PATTERN', counter:['RONIT [3] — throw VEL at the statue core','RONIT [3] — VEL statue ke core pe phenko'] },
};
function bossObjective(){
  const hp='◉'.repeat(Math.max(0,3-bossRound))+'○'.repeat(Math.min(3,bossRound));
  let t='';
  if (finaleStep===1) t=L('GUARDIAN CALMED — AADHYA [2]: RESTORE the kamal at the dais','GUARDIAN SHAANT — AADHYA [2] dais ke kamal pe RESTORE karo');
  else if (shadow.on) t=L('SHADOW-MASH — only your LEAST used hero can face it','SHADOW-MASH — tumhara sabse KAM use hua hero hi ise pehchanta hai');
  else if (coreOpen>900) t=L('FINAL BREAK — RUDRA [1]: ASTRA FIST at the statue base!','FINAL BREAK — RUDRA [1] statue ke base pe ASTRA FIST!');
  else if (coreOpen>0) t=L(`CORE EXPOSED (${Math.ceil(coreOpen)}s) — RUDRA [1]: ASTRA FIST at the statue base!`,`CORE EXPOSED (${Math.ceil(coreOpen)}s) — RUDRA [1] statue ke base pe ASTRA FIST!`);
  else if (wave && !wave.read) t=L(`GUARDIAN ${hp} — READ the pattern with IRA [4] SCAN`,`GUARDIAN ${hp} — IRA [4] SCAN se pattern READ karo`);
  else if (wave) t=`GUARDIAN ${hp} — ${PATTERN_INFO[wave.type].nm}: ${pick(PATTERN_INFO[wave.type].counter)}`;
  if (t) $('objective').textContent=t;
}
function startBoss(){
  bossOn=true; bossLock=true; bossRound=0; coreOpen=0; finaleT=-1; finaleStep=0;
  musicStart('boss');
  bossRevealPend=true; bossSpiritG.visible=false; bossRise=0; bossSpirit.material.opacity=0; bossSpirit.material.color.setHex(0xffffff);
  gateGroup.visible=true;
  shake=20; sfx.bell(); sfx.break_();
  guardFace.material.emissiveIntensity=3.2;
  guardCore.material.emissiveIntensity=2.6;
  bossOrder=['drifter','vine','bell'].sort(()=>Math.random()-0.5);
  try{ const a=rpAudio('vo_boss'); a.currentTime=0; a.volume=0.95; a.play(); }catch(e){}
  const bc=$('bosscard'); bc.classList.remove('show'); void bc.offsetWidth; bc.classList.add('show');
  clearTimeout(startBoss._t); startBoss._t=setTimeout(()=>bc.classList.remove('show'), 3600);
  flashFX('rgba(196,69,54,.45)', 500);
  toastHint(LB('THE DROWNED GUARDIAN HAS WOKEN — the gate is sealed! READ → COUNTER → BREAK!','DROWNED GUARDIAN JAAG GAYA — gate band ho gaya! READ → COUNTER → BREAK!'), 4200);
  startWave(bossOrder[0]);
}
const WAVE_COL={ drifter:0x9adfff, vine:0x3ee8a0, bell:0xff4a5a };
function startWave(type){
  wave={ type, read:false, justRead:false, t:0, pulse:0 };
  // boss ka mood/rang har pattern ke saath badalta hai (sirf golden nahi)
  const wc=WAVE_COL[type];
  guardFace.material.emissive.setHex(wc);
  guardCore.material.emissive.setHex(wc);
  yantraRings[1].material.color.setHex(wc);
  yantraRings[2].material.color.setHex(wc);
  bossSpirit.material.color.setHex({ drifter:0xcfeaff, vine:0xaff5d5, bell:0xffb0b8 }[type]||0xffffff);
  burst(700,180,wc,40,60);
  if (type==='drifter'){ wisps.forEach((w,i)=>{ w.alive=true; w.g.visible=true; w.x=700+Math.cos(i*2.1)*70; w.y=250+Math.sin(i*2.1)*60; }); }
  if (type==='vine'){ vineStrips.forEach((v,i)=>{ v.mode=0; v.t=-i*0.8; v.spikes.visible=false; v.tele.material.opacity=0; }); }
  if (type==='bell'){ bossRings.forEach(r=>{ r.R=-1; r.m.material.opacity=0; }); }
  bossObjective();
}
function clearWaveFX(){
  wisps.forEach(w=>{ w.alive=false; w.g.visible=false; });
  vineStrips.forEach(v=>{ v.mode=0; v.tele.material.opacity=0; v.spikes.visible=false; });
  bossRings.forEach(r=>{ r.R=-1; r.m.material.opacity=0; });
}
function clearWave(){
  resonanceHit();
  wave=null; clearWaveFX();
  burst(700,250,0x9adfff,50,40); sfx.contain(); shake=8;
  coreOpen=8; coreMark.material.opacity=0.9;
  toastHint(LB('PATTERN CALMED! CORE EXPOSED — RUDRA [1] to the statue base!','PATTERN SHAANT! CORE EXPOSED — RUDRA [1] statue ke base pe!'), 3600);
  bossObjective();
}
function coreHit(){
  coreOpen=0; coreMark.material.opacity=0;
  bossRound++; shake=22; sfx.break_();
  burst(CORE_POS.x,CORE_POS.y,0xffb347,60,70);
  guardCore.material.emissiveIntensity=Math.max(0.6, 2.6-bossRound*0.7);
  if (bossRound<3){
    toastHint(LB(`The Guardian staggers! (${bossRound}/3) — a new pattern is coming…`,`GUARDIAN ko jhatka laga! (${bossRound}/3) — naya pattern aa raha hai…`), 2800);
    setTimeout(()=>{ if (bossOn && playing) startWave(bossOrder[bossRound]); }, 1600);
  } else {
    startShadow();
  }
}
function heroMinMax(){
  const e=Object.entries(abilityUse);
  let most=e[0], least=e[0];
  for (const x of e){ if (x[1]>most[1]) most=x; if (x[1]<=least[1] && x[0]!==most[0]) least=x; }
  return { most:most[0], least:least[0] };
}
function startShadow(){
  const mm=heroMinMax(); shadow.most=mm.most; shadow.least=mm.least;
  shadow.on=true; shadow.x=700; shadow.y=190;
  shadow.hp=3; shadow.stun=0;
  $('vbar').style.display='flex'; $('vbar-name').textContent='SHADOW-MASH'; updateVbar();
  shadowG.visible=true;
  const col=HEROES.find(h=>h.id===shadow.most).accent;
  shadowRing.material.color.setHex(col); shadowRing.material.emissive.setHex(col);
  // evil spirit = most-used hero ki DARK bhootiya copy
  const sspr=shadowG.getObjectByName('sspr');
  if (sspr && SPR[shadow.most+'_idle']){
    sspr.material.map=SPR[shadow.most+'_idle']; sspr.material.needsUpdate=true;
    const img=SPR[shadow.most+'_idle'].image;
    if (img && img.width) sspr.scale.set(92*img.width/img.height, 92, 1);
    sspr.material.color.setHex(0x2a1535);
  }
  // boss arena goes dark-corrupt purple for the twist
  bossSpirit.material.color.setHex(0x7a50a0);
  guardFace.material.emissive.setHex(0x8a30ff);
  guardCore.material.emissive.setHex(0x8a30ff);
  yantraRings[1].material.color.setHex(0x8a30ff);
  yantraRings[2].material.color.setHex(0x8a30ff);
  flashFX('rgba(90,20,120,.55)', 420);
  shake=14; sfx.deny();
  toastHint(LB('The swarm took SHAPE… this pattern is YOURS. Your biggest habit.','Swarm ne SHAPE li… ye pattern TUMHARA hai. Tumhari sabse badi aadat.'), 4200);
  setTimeout(()=>{ if (shadow.on && playing) toastHint(LB('Only the hero you used LEAST can calm it — get close and use the ability!','Ise wahi shaant karega jise tumne sabse KAM use kiya — paas jaake ability!'), 4200); }, 4400);
  bossObjective();
}
function updateVbar(){ $('vbar-hp').textContent='◆'.repeat(Math.max(0,shadow.hp||0))+'◇'.repeat(Math.max(0,3-(shadow.hp||0))); }
function shadowCleared(){
  shadow.on=false; shadowG.visible=false;
  $('vbar').style.display='none';
  burst(shadow.x,shadow.y,0xffffff,60,40); sfx.contain(); shake=10;
  coreOpen=999; coreMark.material.opacity=0.9;
  playStoryVO('vo_shadow');
  toastHint(LB('The shadow has fallen. FINAL BREAK — RUDRA [1] on the core!','Parchhaai haar gayi. FINAL BREAK — RUDRA [1] core pe!'), 3600);
  bossObjective();
}
function startFinale(){
  bossOn=false; bossDone=true; coreOpen=0; coreMark.material.opacity=0;
  finaleStep=1; finaleT=-1;
  guardFace.material.emissiveIntensity=0.7;
  guardFace.material.emissive.setHex(0x3ee8e0);
  guardCore.material.emissive.setHex(0x3ee8e0);
  yantraRings[1].material.color.setHex(0x3ee8e0);
  yantraRings[2].material.color.setHex(0x3ee8e0);
  crystalDrop.material.emissive.setHex(0xff4a5a); crystalDrop.material.emissiveIntensity=1.4;
  shake=18; burst(700,160,0xffb347,80,80); sfx.break_();
  playStoryVO('vo_core');
  toastHint(LB('The core broke… something LONELY was inside. AADHYA [2] — RESTORE the kamal (at the dais)','Core toota… andar koi AKELA tha. AADHYA [2] — kamal ko RESTORE karo (dais pe)'), 4600);
  bossObjective();
}
function wrongUse(msg){
  stability=Math.max(0,stability-4); updateStabHud(); sfx.deny(); shake=6;
  toastHint(msg, 2600);
  if (stability<=0) endRun(false);
}
function updateBoss(dt,t){
  if (finaleStep===2){
    finaleT+=dt;
    diyas.forEach((d,i)=>{ if (finaleT>i*0.3) d.material.emissiveIntensity=2.2; });
    yantraRings.forEach(r=>{ r.material.opacity=Math.min(1, r.material.opacity+dt*0.4); });
    crystal.rotation.y+=dt*3;
    if (finaleT>3.6){ finaleStep=3; endRun(true); }
    return;
  }
  if (finaleStep===1){ bossObjective(); return; }
  if (!bossOn) return;
  bossObjective();
  guardFace.material.emissiveIntensity=3.2+Math.sin(t*5)*0.6;
  if (coreOpen>0 && coreOpen<900){
    coreOpen-=dt;
    coreMark.material.opacity=0.5+Math.sin(t*6)*0.4;
    if (coreOpen<=0){
      coreOpen=0; coreMark.material.opacity=0;
      toastHint(LB('The core sealed again… the pattern returned','Core phir band ho gaya… pattern lauta'), 2400);
      startWave(bossOrder[Math.min(bossRound,2)]);
    }
  }
  if (wave){
    wave.t+=dt;
    if (wave.type==='drifter'){
      const sp=66+bossRound*10;
      wisps.forEach((w,i)=>{
        if (!w.alive) return;
        const d=Math.hypot(px-w.x,py-w.y)||1;
        w.x+=(px-w.x)/d*sp*dt; w.y+=(py-w.y)/d*sp*dt;
        w.g.position.set(w.x, 4+Math.sin(t*2+i)*4, w.y);
        w.g.rotation.y=Math.atan2(px-w.x,py-w.y);
        if (d<pr+16) hurt(10,w.x,w.y);
      });
    }
    if (wave.type==='vine'){
      vineStrips.forEach(v=>{
        v.t+=dt;
        if (v.mode===0 && v.t>0){ v.mode=1; v.t=0; }
        else if (v.mode===1){
          v.tele.material.opacity=0.25+Math.sin(t*10)*0.15;
          if (v.t>1.1){ v.mode=2; v.t=0; v.tele.material.opacity=0; v.spikes.visible=true; blip(180,.15,'sawtooth',.08); }
        } else if (v.mode===2){
          if (Math.abs(py-v.ry)<16 && px>600 && px<800) hurt(12,px,v.ry+30);
          if (v.t>1.4){ v.mode=0; v.t=-1.6; v.spikes.visible=false; }
        }
      });
    }
    if (wave.type==='bell'){
      wave.pulse+=dt;
      if (wave.pulse>1.9-bossRound*0.2){
        wave.pulse=0;
        const free=bossRings.find(r=>r.R<0);
        if (free){ free.R=14; blip(420,.5,'sine',.1); }
      }
      bossRings.forEach(r=>{
        if (r.R<0) return;
        r.R+=130*dt;
        r.m.scale.set(r.R,r.R,1);
        r.m.material.opacity=Math.max(0,0.6-r.R/400);
        const d=Math.hypot(px-700,py-250);
        if (Math.abs(d-r.R)<14 && r.R>30) hurt(10,700,250);
        if (r.R>240){ r.R=-1; r.m.material.opacity=0; }
      });
    }
  }
  if (shadow.on){
    const d=Math.hypot(px-shadow.x,py-shadow.y)||1;
    if ((shadow.stun||0)>0){ shadow.stun-=dt; }
    else { shadow.x+=(px-shadow.x)/d*118*dt; shadow.y+=(py-shadow.y)/d*118*dt; }
    shadowG.position.set(shadow.x, 3+Math.sin(t*3.2)*4, shadow.y); // ghostly hover
    shadowG.rotation.y=Math.atan2(px-shadow.x,py-shadow.y);
    shadowRing.rotation.z=t*3;
    const sspr=shadowG.getObjectByName('sspr');
    if (sspr) sspr.material.opacity=0.72+Math.sin(t*13)*0.14+Math.sin(t*31)*0.06; // spirit flicker
    const saura=shadowG.getObjectByName('saura');
    if (saura) saura.material.opacity=0.12+Math.sin(t*4)*0.05;
    if (Math.random()<dt*7) burst(shadow.x,shadow.y,0x7a20a0,2,16); // dark embers
    if ((shadow.stun||0)<=0 && d<pr+18) hurt(12,shadow.x,shadow.y);
  }
}

// ============ HERO BILLBOARDS (canonical sheet-accurate sprites — designs 100% locked) ============
const heroModels = [];
function buildHeroModel(h){
  const g = new THREE.Group();
  // blob shadow
  const blob = new THREE.Mesh(new THREE.CircleGeometry(14,24),
    new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.42, depthWrite:false }));
  blob.rotation.x=-Math.PI/2; blob.position.y=0.6; g.add(blob);
  // accent identity ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(16,1.4,8,32),
    new THREE.MeshStandardMaterial({ color:h.accent, emissive:h.accent, emissiveIntensity:1.5 }));
  ring.rotation.x=Math.PI/2; ring.position.y=2.2; ring.name='ring'; g.add(ring);
  // sprite billboard (asli canonical art)
  const mat = new THREE.SpriteMaterial({ map:SPR[h.id+'_idle'], transparent:true });
  const spr = new THREE.Sprite(mat);
  spr.center.set(0.5, 0);      // feet anchor
  spr.scale.set(32, 84, 1);    // aspect fix after load
  spr.position.y=1.2;
  spr.name='spr'; g.add(spr);
  g.userData.face=1;
  g.visible=false;
  scene3.add(g);
  return g;
}
HEROES.forEach(h=>heroModels.push(buildHeroModel(h)));
let poseT=0, lastAbilCd=0;

function switchHero(i){
  if (!playing || i===activeHero) return;
  swaps++;
  heroModels[activeHero].visible=false;
  activeHero=i;
  heroModels[i].visible=true;
  burst(px,py,HEROES[i].accent,14,26);
  sfx.swap(); refreshHeroBar(); updateObjective();
}
addEventListener('keydown', e=>{
  if (e.code.startsWith('Digit')){
    const n=parseInt(e.code.slice(5))-1;
    if (n>=0 && n<4) switchHero(n);
  }
  if ((e.code==='Space'||e.code==='KeyE') && playing) doAbility();
  keys[e.code]=true;
});
addEventListener('keyup', e=>keys[e.code]=false);
const keys={};

// touch
let stickV={x:0,y:0}, stickId=null;
const stick=$('stick'), knob=$('knob');
stick.addEventListener('touchstart', e=>{ stickId=e.changedTouches[0].identifier; }, {passive:true});
addEventListener('touchmove', e=>{
  for (const t of e.changedTouches) if (t.identifier===stickId){
    const r=stick.getBoundingClientRect(), cx=r.left+55, cy=r.top+55;
    let dx=t.clientX-cx, dy=t.clientY-cy; const d=Math.hypot(dx,dy)||1, m=Math.min(d,40);
    dx=dx/d*m; dy=dy/d*m;
    knob.style.left=(35+dx)+'px'; knob.style.top=(35+dy)+'px';
    stickV={x:dx/40, y:dy/40};
  }
}, {passive:true});
addEventListener('touchend', e=>{
  for (const t of e.changedTouches) if (t.identifier===stickId){
    stickId=null; stickV={x:0,y:0}; knob.style.left='35px'; knob.style.top='35px';
  }
});
$('actbtn').addEventListener('touchstart', e=>{ e.preventDefault(); if(playing) doAbility(); });

// ============ ABILITIES ============
function toastHint(t, ms=2400){
  const h=$('hint'); const parts=String(t).split('\n');
  h.replaceChildren();
  const main=document.createElement('div'); main.textContent=parts[0]||''; h.appendChild(main);
  if(parts[1]){ const sub=document.createElement('div'); sub.textContent=parts[1];
    sub.style.cssText='margin-top:2px;font-size:.72rem;font-style:italic;letter-spacing:0;color:#d9c7a4;font-family:Georgia,serif';
    h.appendChild(sub); }
  h.style.display='block';
  clearTimeout(toastHint._t); toastHint._t=setTimeout(()=>$('hint').style.display='none', ms); }

function doAbility(){
  if (abilCd>0){ sfx.deny(); return; }
  const h = HEROES[activeHero].id;
  // ---------- TUTORIAL ----------
  if (tutOn){ tutAbility(h); return; }
  // ---------- BOSS PHASE ----------
  if (bossOn || finaleStep===1){
    if (shadow.on){
      if (h===shadow.least && Math.hypot(px-shadow.x,py-shadow.y)<150){
        abilCd=1.2; abilityUse[h]++;
        shadow.hp--; shadow.stun=0.9;
        burst(shadow.x,shadow.y,0xc080ff,30,30); sfx.contain(); shake=8;
        flashFX('rgba(154,80,255,.4)', 240);
        const kd=Math.hypot(shadow.x-px,shadow.y-py)||1;
        shadow.x+=(shadow.x-px)/kd*90; shadow.y+=(shadow.y-py)/kd*90;
        updateVbar();
        if (shadow.hp<=0){ shadowCleared(); return; }
        toastHint(LB(`SHADOW HIT! ${shadow.hp} more…`,`SHADOW ko laga! ${shadow.hp} aur…`), 2200);
        return;
      }
      if (h!==shadow.least){ abilCd=0.8; wrongUse(L('The shadow swallowed the attack… wrong hero. Think: who did you forget?','Shadow ne attack nigal liya… ye wo hero nahi hai. Socho: kise bhool gaye the?')); return; }
      toastHint(LB('Get closer to the shadow — then use the ability!','Paas jao shadow ke — phir ability!')); sfx.deny(); return;
    }
    if (finaleStep===1){
      if (h==='aadhya' && Math.hypot(px-DAIS.x,py-DAIS.y)<80){
        abilCd=1.2; abilityUse.aadhya++;
        finaleStep=2; finaleT=0; sfx.restore();
        crystalDrop.material.emissive.setHex(0x3ee8e0); crystalDrop.material.emissiveIntensity=2.4;
        burst(DAIS.x,DAIS.y,0x3ee8e0,70,60);
        toastHint(LB('SHAKTI RESTORE… the breach is calm. A fifth pattern found: SAATH. The diyas are burning.','SHAKTI RESTORE… breach shaant. Paanchwa pattern mil gaya: SAATH. Diyas jal rahe hain.'), 4600);
        return;
      }
      if (h==='aadhya'){ toastHint(LB('Aadhya: stand right next to the dais kamal','Aadhya: dais ke kamal ke bilkul paas jao')); sfx.deny(); return; }
      wrongUse(L('Only AADHYA and her RESTORE can heal this now','Ab sirf AADHYA ka RESTORE hi ise theek kar sakta hai')); return;
    }
    if (coreOpen>0){
      if (h==='rudra' && Math.hypot(px-CORE_POS.x,py-CORE_POS.y)<95){
        abilCd=1.2; abilityUse.rudra++;
        burst(px,py,0xffd98a,20,34);
        if (coreOpen>900) startFinale(); else coreHit();
        return;
      }
      if (h==='rudra'){ toastHint(LB('Rudra: run to the statue base (top of the arena)!','Rudra: statue ke base tak bhago (arena ke upar)!')); sfx.deny(); return; }
      wrongUse(L('Only RUDRA and his ASTRA FIST can break the core!','Core sirf RUDRA ke ASTRA FIST se tootega!')); return;
    }
    if (wave){
      if (h==='ira'){
        abilCd=2.0; scanT=0; sfx.scan(); abilityUse.ira++; startDrishti();
        if (!wave.read){
          wave.read=true; wave.justRead=true;
          toastHint('SCAN LOCK — '+PATTERN_INFO[wave.type].nm+'!\n'+LBa(PATTERN_INFO[wave.type].counter), 3800);
          bossObjective();
        }
        return;
      }
      if (!wave.read){ wrongUse(L('Pattern not READ yet — IRA [4] SCAN first!','Pattern abhi READ nahi hua — pehle IRA [4] ka SCAN!')); return; }
      if (wave.type==='vine' && h==='aadhya'){ abilCd=1.2; abilityUse.aadhya++; sfx.restore(); vineFX(px,py); burst(px,py,0x3ee8a0,26,24); clearWave(); return; }
      if (wave.type==='bell' && h==='ronit'){
        abilCd=1.2; abilityUse.ronit++;
        velAnim={ t:0, fx:px, fz:py, tx:CORE_POS.x, tz:CORE_POS.y, hit:'bossbell' };
        velMesh.visible=true; return;
      }
      wrongUse(L('Wrong counter! ','Galat counter! ')+pick(PATTERN_INFO[wave.type].counter)); return;
    }
    sfx.deny(); return;
  }
  // ---------- OVERWORLD ----------
  if (h==='rudra'){
    if (stalker.state!=='contained' && Math.hypot(px-stalker.x,py-stalker.y)<130){
      abilCd=0.9; abilityUse.rudra++;
      worsenStalker();
      wrongUse(LB('WRONG HALF — the claws multiplied.','GALAT AADHA — panje badh gaye.'));
      return;
    }
    if (!barrierBroken && rectHit(px,py,pr+42,BARRIER)){
      barrierBroken=true; abilCd=1.2; shake=16; sfx.break_(); abilityUse.rudra++;
      // ASTRA FIST — Rudra khud weapon hai: divine bracelet + markings se golden energy gauntlet
      burst(px,py,0xffd98a,20,34);
      burst(BARRIER[0]+100,BARRIER[1]+18,0xffb347,46,30);
      barrierMesh.visible=false;
      toastHint(LB('ASTRA FIST — BREAK! The barrier shattered.','ASTRA FIST — BREAK! Barrier shatter ho gaya.'));
      updateObjective(); return;
    }
    toastHint(LB('Rudra: stand near an unstable (sindoor) barrier','Rudra: kisi unstable (sindoor) barrier ke paas jao')); sfx.deny(); return;
  }
  if (h==='aadhya'){
    if (stalker.state!=='contained' && Math.hypot(px-stalker.x,py-stalker.y)<140){
      abilCd=1.2; sfx.restore(); abilityUse.aadhya++;
      burst(stalker.x,stalker.y,0x3ee8a0,30,20); vineFX(stalker.x,stalker.y);
      containCreature(stalker);
      return;
    }
    if (!bridgeOk && rectHit(px,py,pr+46,BRIDGE)){
      bridgeOk=true; abilCd=1.2; sfx.restore(); abilityUse.aadhya++;
      bridgeMesh.material.emissive.setHex(0x3ee8a0);
      bridgeMesh.material.emissiveIntensity=1.1;
      bridgeMesh.material.color.setHex(0x1a4a3a);
      burst(BRIDGE[0]+40,BRIDGE[1]+45,0x3ee8e0,36,16); vineFX(BRIDGE[0]+40,BRIDGE[1]+45);
      toastHint(LB('SHAKTI RESTORE! The bridge is safe now.','SHAKTI RESTORE! Pul ab safe hai.'));
      updateObjective(); return;
    }
    toastHint(LB('Aadhya: stand near something corrupted (red)','Aadhya: corrupted (red) cheez ke paas jao')); sfx.deny(); return;
  }
  if (h==='ronit'){
    if (mimic.state==='revealed' && Math.hypot(px-mimic.x,py-mimic.y)<300){
      abilCd=1.2; abilityUse.ronit++;
      velAnim={ t:0, fx:px, fz:py, tx:mimic.x, tz:mimic.y, hit:'mimic' };
      velMesh.visible=true;
      return;
    }
    const d = Math.hypot(px-MECH.x, py-MECH.y);
    if (mechSeen && !mechOn && d<300){
      abilCd=1.2; abilityUse.ronit++;
      velAnim={ t:0, fx:px, fz:py, tx:MECH.x, tz:MECH.y, hit:'mech' };
      velMesh.visible=true;
      return; // completion in loop
    }
    if (mimic.state==='revealed'){ toastHint(LB('Ronit: get within 300 range of the Mimic — but not too close!','Ronit: Mimic ke 300 range mein aao — par zyada paas mat jao!')); }
    else if (!mechSeen){ toastHint(LB('Ronit: the mechanism is still hidden — use Ira and her SCAN','Ronit: mechanism abhi hidden hai — Ira ka SCAN use karo')); }
    else toastHint(LB('Ronit: get within 300 range of the bell mechanism (across the water)','Ronit: bell mechanism ke 300 range mein aao (paani ke paar)'));
    sfx.deny(); return;
  }
  if (h==='ira'){
    abilCd=2.5; scanT=0; sfx.scan(); abilityUse.ira++; startDrishti();
    return; // effects in loop
  }
}

// objective tracker
function updateObjective(){
  if (tutOn) return;
  let t='';
  if (!barrierBroken) t=L('① RUDRA [1] — break the unstable barrier (north)','① RUDRA [1] — unstable barrier todo (north)');
  else if (!bridgeOk) t=L('② AADHYA [2] — restore the corrupted bridge','② AADHYA [2] — corrupted pul restore karo');
  else if (!mechSeen) t=L('③ IRA [4] — SCAN to find the hidden mechanism','③ IRA [4] — SCAN se hidden mechanism dhundo');
  else if (!mechOn) t=L('④ RONIT [3] — trigger the bell mechanism with Vel','④ RONIT [3] — Vel se bell mechanism trigger karo');
  else t=L('⑤ Reach the BREACH DAIS — the gate is open!','⑤ BREACH DAIS pe pahuncho — gate khula hai!');
  $('objective').textContent = t;
}

// ============ INTRO — CINEMATIC + DIALOGUE (E5, skippable, EN + Hinglish sub) ============
const CINE=[
 {img:'assets/cine/p1.jpg', en:'Neo-Varanasi, 2042. The city of light never sleeps.', hi:'Roshni ka sheher — jahan Ganga neon mein behti hai.'},
 {img:'assets/cine/p2.jpg', en:'Tonight, the Astra Grid cracked open.', hi:'Aaj raat, Astra Grid toot gaya.'},
 {img:'assets/cine/p3.jpg', en:'Broken patterns walk the ghats — lost, hungry, afraid.', hi:'Toote patterns ghats pe bhatak rahe hain — bhatke hue, adhoore.'},
 {img:'assets/cine/p4.jpg', en:'Four friends. One promise — no one fights alone.', hi:'Chaar dost. Ek vaada — koi akela nahi ladega.'},
 {img:'assets/cine/p5.jpg', en:'Tonight, they keep that promise.', hi:'Aaj raat, wo vaada nibhayenge.'}
];
const DLG=[
 {who:'IRA', col:'#9adfff', port:'assets/portraits/ira.png', en:'Scan complete. The breach is right below Ghat Sector 7.', hi:'Breach theek Sector 7 ke neeche hai.'},
 {who:'RUDRA', col:'#ffb347', port:'assets/portraits/rudra.png', en:'Then that is where we go. Together.', hi:'Toh wahin chalenge. Saath mein.'},
 {who:'RONIT', col:'#ff4a5a', port:'assets/portraits/ronit.png', en:'Three patterns between us and the core. I counted.', hi:'Raaste mein teen patterns hain — maine gin liye.'},
 {who:'AADHYA', col:'#3ee8a0', port:'assets/portraits/aadhya.png', en:'They are not monsters. They are broken songs — we restore the melody.', hi:'Wo monsters nahi, adhoore sur hain — hum dhun wapas laayenge.'},
 {who:'IRA', col:'#9adfff', port:'assets/portraits/ira.png', en:'Stability is dropping fast. Whatever we do — we do it now.', hi:'Stability gir rahi hai. Jo karna hai, ABHI karna hai.'},
 {who:'RUDRA', col:'#ffb347', port:'assets/portraits/rudra.png', en:'Team ANANTA. Breach it.', hi:'Team ANANTA — chalo, todte hain.'}
];
let introSeen=false, cineI=-1, cineTimer=null, dlgI=-1, cineVO=null;
function stopCineVO(){ if (cineVO){ try{ cineVO.pause(); }catch(e){} cineVO=null; } }
function startCinematic(){
  ['splash','results'].forEach(o=>$(o).classList.remove('show'));
  musicStart('title');
  $('cine').classList.add('show'); showCine(0);
}
function showCine(i){
  cineI=i;
  if (i>=CINE.length){ stopCineVO(); $('cine').classList.remove('show'); showDlg(0); return; }
  const c=CINE[i];
  const im=$('cine-img'); im.classList.remove('kb'); void im.offsetWidth; im.src=c.img; im.classList.add('kb');
  const tx=$('cine-text'); tx.classList.remove('fade'); void tx.offsetWidth; tx.classList.add('fade');
  $('cine-en').textContent=c.en; $('cine-hi').textContent=c.hi;
  stopCineVO();
  try{ cineVO=rpAudio('vo_cine'+(i+1)); cineVO.currentTime=0; cineVO.volume=0.95; cineVO.play(); }catch(e){}
  clearTimeout(cineTimer); cineTimer=setTimeout(()=>showCine(i+1), 6200);
}
function showDlg(i){
  dlgI=i;
  if (i>=DLG.length){ finishIntro(); return; }
  const d=DLG[i];
  $('dlg').classList.add('show');
  $('dlg-port').src=d.port; $('dlg-name').textContent=d.who; $('dlg-name').style.color=d.col;
  $('dlg-en').textContent=d.en; $('dlg-hi').textContent=d.hi;
  const bx=$('dlg-box'); bx.classList.remove('fade'); void bx.offsetWidth; bx.classList.add('fade');
}
function finishIntro(){
  introSeen=true; clearTimeout(cineTimer); stopCineVO(); cineI=-1; dlgI=-1;
  $('cine').classList.remove('show'); $('dlg').classList.remove('show');
  startRun();
}
$('cine-skip').onclick=(e)=>{ e.stopPropagation(); clearTimeout(cineTimer); stopCineVO(); $('cine').classList.remove('show'); showDlg(0); };
$('dlg-skip').onclick=(e)=>{ e.stopPropagation(); finishIntro(); };
$('cine').onclick=()=>{ clearTimeout(cineTimer); showCine(cineI+1); };
$('dlg').onclick=()=>showDlg(dlgI+1);
addEventListener('keydown', e=>{
  if (e.code==='Space'||e.code==='Enter'){
    if ($('cine').classList.contains('show')){ clearTimeout(cineTimer); showCine(cineI+1); e.preventDefault(); return; }
    if ($('dlg').classList.contains('show')){ showDlg(dlgI+1); e.preventDefault(); return; }
    if ($('stg').classList.contains('show')){ clearTimeout(stgTimer); showStg(stgI+1); e.preventDefault(); return; }
    if ($('rp').classList.contains('show')){ rpAdvance(); e.preventDefault(); return; }
  }
  if (e.code==='Escape'){
    if ($('cine').classList.contains('show')){ clearTimeout(cineTimer); stopCineVO(); $('cine').classList.remove('show'); showDlg(0); }
    else if ($('dlg').classList.contains('show')) finishIntro();
    else if ($('stg').classList.contains('show')) finishStinger();
    else if ($('rp').classList.contains('show')) finishRP();
  }
});
CINE.forEach(c=>{ const i=new Image(); i.src=c.img; }); // non-blocking preload

// ============ RAKSHAK PARICHAY (voiced hero intro — narrator + theme) ============
const RP=[
 {a:'vo1_open', img:'assets/cine/title_bg.jpg', en:'Whenever darkness has fallen… the guardians have risen. Four powers from beyond the universe walk the ground.', hi:'Jab jab andhera gehraya… tab tab RAKSHAK jaage. Brahmaand ke paar ki chaar shaktiyan dharti par utri hain.'},
 {a:'vo2_ronit', img:'assets/cine/rp_ronit.jpg', dim:.28, en:'The Commander — the enemy falls before it ever sees him. One aim. One strike. One end.', hi:'SENAPATI — dushman dekh paaye usse pehle gir chuka hota hai. Ek nishana. Ek waar. Ek ant.'},
 {pause:1100},
 {a:'vo2n_name', img:'assets/cine/rp_ronit.jpg', name:'RONIT', tag:'SENAPATI'},
 {a:'vo3_ira', img:'assets/cine/rp_ira.jpg', dim:.28, en:'The mind of the team — from a thousand lies she catches the one truth. Her eyes see what no one has seen.', hi:'Team ka dimaag — hazaar jhooth mein chhupa EK sach pal bhar mein. Uski aankhein wo dekhti hain jo kisi ne nahi dekha.'},
 {pause:1100},
 {a:'vo3n_name', img:'assets/cine/rp_ira.jpg', name:'IRA', tag:'TRINETRA-DRISHTI'},
 {a:'vo4_aadhya', img:'assets/cine/rp_aadhya.jpg', dim:.28, en:'The heartbeat of life — where everything breaks, that is where she begins.', hi:'Jeevan ki dhadkan — jahan sab toot jaata hai, wahin se wo shuru karti hai.'},
 {pause:1100},
 {a:'vo4n_name', img:'assets/cine/rp_aadhya.jpg', name:'AADHYA', tag:'SHAKTI-SWAROOPA'},
 {a:'vo5_question', q:true, en:'"And… who is HE?"', hi:'"Aur… woh kaun hai?"'},
 {a:'vo6_prem', img:'assets/cine/rp_rudra.jpg', dim:.1, en:'In his last life… with a single strike… he rose to end the whole world — for his love.', hi:'Pichhle janam mein… keval EK waar se… poori srishti mitaane chala tha — apne PREM ke liye.'},
 {a:'vo7_kaun', q:true, en:'"WHO is he?"', hi:'"Kaun hai woh? Aakhir kaun hai woh?"'},
 {a:'vo8_rudra', img:'assets/cine/rp_rudra.jpg', dim:.14, en:'The one who himself does not know the limit of his power…', hi:'Jise SWAYAM bhi apni shaktiyon ka andaaza nahi…'},
 {pause:2200},
 {a:'vo8n_name', img:'assets/cine/rp_rudra.jpg', name:'RUDRA', tag:'SWAYAM ANANT', drop:true},
 {a:'vo9_close', img:'assets/cine/p4.jpg', en:'These are… the Guardians of ANANTA. And this night belongs to them.', hi:'Ye hain… ANANTA ke rakshak. Aur ye raat… inke naam hogi.'}
];
const RPA={};
function rpAudio(name){ // LANG-aware: English mode = en_ clips, Hinglish = Hindi clips
  const k=(LANG==='en'?'en_':'')+name;
  if(!RPA[k]){ const a=new Audio('assets/audio/'+k+'.mp3'); a.preload='auto'; RPA[k]=a; }
  return RPA[k];
}
let storyVO=null, storyGen=0;
function duckMusic(down){
  try{
    if(!MUS.master) return;
    const c=ac(), g=MUS.master.gain;
    g.cancelScheduledValues(c.currentTime);
    g.linearRampToValueAtTime(down?0.18:1, c.currentTime+0.12);
  }catch(e){}
}
function stopStoryVO(){
  storyGen++;
  if(storyVO){ try{ storyVO.onended=null; storyVO.onerror=null; storyVO.pause(); storyVO.currentTime=0; }catch(e){} storyVO=null; }
  duckMusic(false);
}
function playStoryVO(name){
  stopStoryVO();
  const gen=storyGen;
  try{
    const a=rpAudio(name); a.currentTime=0; a.volume=0.96; storyVO=a; duckMusic(true);
    a.onended=()=>{ if(gen===storyGen) duckMusic(false); };
    const pending=a.play(); if(pending&&pending.catch) pending.catch(()=>{});
  }catch(e){}
}
const rpTheme=new Audio('assets/audio/theme_ananta.mp3'); rpTheme.preload='auto';
let rpI=-1, rpTimer=null, rpNextFn=null, rpCur=null;
function startRP(nextFn){
  rpNextFn=nextFn; musicStop();
  RP.forEach(s=>{ if(s.a) rpAudio(s.a); });
  ['splash','results'].forEach(o=>$(o).classList.remove('show'));
  $('rp').classList.add('show');
  try{ rpTheme.currentTime=0; rpTheme.volume=0.14; rpTheme.play(); }catch(e){}
  rpShow(0);
}
function rpShow(i){
  rpI=i; clearTimeout(rpTimer);
  if (rpCur){ try{ rpCur.pause(); }catch(e){} rpCur=null; }
  if (i>=RP.length){ finishRP(); return; }
  const s=RP[i];
  const im=$('rp-img'), nm=$('rp-name'), tg=$('rp-tag'), q=$('rp-q'), tx=$('rp-text'), fl=$('rp-flash');
  nm.classList.remove('bang'); nm.style.display='none'; tg.style.display='none';
  q.style.display = s.q ? 'flex' : 'none';
  fl.classList.remove('go');
  if (s.pause){ // dramatic black gap
    im.classList.remove('on'); tx.style.display='none';
    rpTimer=setTimeout(()=>rpShow(i+1), s.pause); return;
  }
  if (s.img){
    im.classList.remove('kb2'); void im.offsetWidth;
    im.src=s.img; im.classList.add('on','kb2');
    im.style.filter = s.dim!=null ? `brightness(${s.dim}) saturate(.6) contrast(1.15)` : 'none';
  } else im.classList.remove('on');
  if (s.name){ // NAME BLAST
    im.style.filter='none';
    void fl.offsetWidth; fl.classList.add('go');
    nm.textContent=s.name; nm.classList.add('bang');
    tg.textContent=s.tag||''; tg.style.display='block';
    if (s.drop){ try{ rpTheme.currentTime=43.2; rpTheme.volume=0.6; rpTheme.play(); }catch(e){} }
    blip(220,.4,'square',.06);
  }
  if (s.en){ tx.style.display='block'; tx.classList.remove('fade'); void tx.offsetWidth; tx.classList.add('fade');
    $('rp-en').textContent=s.en; $('rp-hi').textContent=s.hi||'';
  } else tx.style.display='none';
  const a = s.a ? rpAudio(s.a) : null;
  if (a){ rpCur=a;
    a.onended=()=>{ if(rpI===i) rpTimer=setTimeout(()=>rpShow(i+1), s.name?900:250); };
    a.currentTime=0;
    a.play().catch(()=>{ rpTimer=setTimeout(()=>rpShow(i+1), 4000); });
    rpTimer=setTimeout(()=>{ if(rpI===i) rpShow(i+1); }, 20000); // safety
  }
}
function rpAdvance(){ if($('rp').classList.contains('show')) rpShow(rpI+1); }
function finishRP(){
  clearTimeout(rpTimer); rpI=-1;
  if (rpCur){ try{ rpCur.pause(); }catch(e){} rpCur=null; }
  const fade=setInterval(()=>{ rpTheme.volume=Math.max(0,rpTheme.volume-0.07); if(rpTheme.volume<=0){ rpTheme.pause(); clearInterval(fade);} },90);
  $('rp').classList.remove('show');
  const fn=rpNextFn; rpNextFn=null; if (fn) fn();
}
$('rp-skip').onclick=(e)=>{ e.stopPropagation(); finishRP(); };
$('rp').onclick=rpAdvance;
$('b-rp').onclick=()=>{ ac(); startRP(()=>{ $('splash').classList.add('show'); }); };

// ============ POST-CREDITS STINGER (ANANTA universe teaser — canon: watcher + uske 4) ============
const STG=[
 {img:'assets/cine/stg1.jpg', en:'Sector 7 sleeps. The city does not.', hi:'Sector 7 so gaya… par sheher abhi jaag raha hai.'},
 {img:'assets/cine/stg2.jpg', en:'SAATH whispers — "There are others like me. Trapped. Calling."', hi:'SAATH fusfusaya — "Mere jaise aur bhi hain. Kaid mein. Pukaarte hue."'},
 {img:'assets/cine/stg3.jpg', en:'You defeated a shadow… and called it victory? Celebrate, guardians. Next time, you will not be saving a city. You will be saving each other. My four… awaken.', hi:'Ek parchhaai ko hara kar tum khud ko vijeta samajh baithe? Jashn mana lo, rakshako. Agli baar sheher nahi — ek doosre ko bachaana hoga. Mere chaaron… jaago.'}
];
let stgI=-1, stgTimer=null, stgVO=null, endingVO=null;
function stopEndingVO(){
  if(endingVO){ try{ endingVO.onended=null; endingVO.onerror=null; endingVO.pause(); endingVO.currentTime=0; }catch(e){} endingVO=null; }
}
function stopStgVO(){
  if(stgVO){ try{ stgVO.onended=null; stgVO.onerror=null; stgVO.pause(); stgVO.currentTime=0; }catch(e){} stgVO=null; }
}
function armCue(audio, fallbackMs, gapMs, go){
  let fired=false;
  const run=()=>{ if(fired) return; fired=true; clearTimeout(stgTimer); go(); };
  clearTimeout(stgTimer);
  stgTimer=setTimeout(run, fallbackMs);
  if(!audio) return;
  audio.onended=()=>{ if(fired) return; clearTimeout(stgTimer); stgTimer=setTimeout(run, gapMs); };
  audio.onerror=()=>{ if(fired) return; clearTimeout(stgTimer); stgTimer=setTimeout(run, 6200); };
}
function startStinger(){
  stopStoryVO(); stopEndingVO(); stopStgVO(); clearTimeout(stgTimer);
  stgI=-1;
  $('stg').classList.add('show');
  $('stg-img').src='assets/cine/ending.jpg';
  $('stg-brand').style.display='none';
  $('stg-en').textContent='The breach is sealed. Sector 7 breathes again. Four guardians. One bond — SAATH.';
  $('stg-hi').textContent='Breach band. Sector 7 phir saans le raha hai. Chaar rakshak. Ek bandhan — SAATH.';
  const next=()=>{ if(stgI===-1 && $('stg').classList.contains('show')) showStg(0); };
  try{
    endingVO=rpAudio('vo_end'); endingVO.currentTime=0; endingVO.volume=0.95;
    const pending=endingVO.play();
    if(pending&&pending.catch) pending.catch(()=>{});
    armCue(endingVO, 20000, 550, next);
  }catch(e){ armCue(null, 6200, 0, next); }
}
function showStg(i){
  stopEndingVO(); stopStgVO(); clearTimeout(stgTimer);
  stgI=i;
  if (i>=STG.length){ finishStinger(); return; }
  const beat=STG[i];
  const im=$('stg-img'); im.classList.remove('kb'); void im.offsetWidth; im.src=beat.img; im.classList.add('kb');
  const tx=$('stg-text'); tx.classList.remove('fade'); void tx.offsetWidth; tx.classList.add('fade');
  $('stg-en').textContent=beat.en; $('stg-hi').textContent=beat.hi;
  $('stg-brand').style.display = i===2 ? 'block' : 'none';
  if (i===2) blip(65,2.4,'sawtooth',.055);
  const advance=()=>{ if(stgI===i && $('stg').classList.contains('show')) showStg(i+1); };
  try{
    stgVO=rpAudio('vo_stg'+(i+1)); stgVO.currentTime=0; stgVO.volume=0.96;
    const pending=stgVO.play();
    if(pending&&pending.catch) pending.catch(()=>{});
    armCue(stgVO, i===2?24000:14000, 500, advance);
  }catch(e){ armCue(null, 6200, 0, advance); }
}
function finishStinger(){ stopStoryVO(); stopEndingVO(); stopStgVO(); clearTimeout(stgTimer); stgI=-1; $('stg').classList.remove('show'); $('results').classList.add('show'); }
$('stg-skip').onclick=(e)=>{ e.stopPropagation(); finishStinger(); };
$('stg').onclick=()=>{ clearTimeout(stgTimer); showStg(stgI+1); };
STG.forEach(s=>{ const i=new Image(); i.src=s.img; });

// BEST RECORD (title screen pe — replay chase)
function updateBestRec(){
  try{ const b=JSON.parse(localStorage.getItem('ananta_best')||'null');
    if (b){ $('bestrec').style.display='block'; $('bestrec').textContent='🏆 BEST: '+b.grade+' · '+b.secs+'s'; }
  }catch(e){}
}
updateBestRec();
// boot card fade (Made by Rudra Khaire studio card)
setTimeout(()=>{ const b=$('boot'); b.style.opacity='0'; setTimeout(()=>b.classList.remove('show'), 850); }, 2300);

// ============ GAME FLOW ============
$('b-start').onclick = ()=>{ ac();
  if (introSeen) { startRun(); return; }
  let seen=false; try{ seen=!!localStorage.getItem('ananta_rp_seen'); }catch(e){}
  if (!seen){ try{ localStorage.setItem('ananta_rp_seen','1'); }catch(e){} startRP(()=>startCinematic()); }
  else startCinematic();
};
$('b-again').onclick = ()=>{ if (!introSeen) startCinematic(); else startRun(); };
function startRun(){
  tutOn=false; echoG.visible=false;
  $('sparks').style.display=''; $('patterns').style.display='';
  $('b-again').textContent='RUN AGAIN';
  drifter.g.visible=true; stalker.g.visible=true;
  px=700; py=880; faceAngle=Math.PI;
  barrierBroken=false; bridgeOk=false; hiddenOpen=false; mechSeen=false; mechOn=false;
  hiddenA=1; got=0; swaps=0; abilCd=0; scanT=-1; velAnim=null;
  drishtiT=0; slowT=0; resonT=0; resonCount=0; drishtiGlow=false;
  $('drishti').classList.remove('on'); $('rz').style.opacity=0;
  stability=100; hurtCd=0; contained=0;
  updateStabHud(); $('patterns').textContent='◈ 0 / 3';
  // creatures reset
  drifter.x=450; drifter.y=800; drifter.wi=0; drifter.state='roam'; drifter.met=false;
  restoreEmissives(drifter.g);
  const dg=drifter.g.getObjectByName('glow'); if (dg) dg.visible=true;
  stalker.x=500; stalker.y=652; stalker.wi=0; stalker.state='roam'; stalker.met=false; stalker.rage=0; stalker.dmg=16;
  restoreEmissives(stalker.g);
  mimic.x=1080; mimic.y=830; mimic.state='disguised'; mimic.met=false; mimic.pulseT=0; mimic.ringR=-1;
  mimic.gFake.visible=true; mimic.g.visible=false;
  restoreEmissives(mimic.g);
  [drifter,stalker,mimic].forEach(c=>{ const cs=c.g.getObjectByName('cspr'); if (cs){ cs.material.color.setHex(0xffffff); cs.material.opacity=1; if(c.id==='stalker') cs.scale.set(72,72,1); } });
  echoRing.material.opacity=0; velMesh.visible=false;
  // boss reset
  bossOn=false; bossDone=false; bossLock=false; bossRound=0; wave=null; coreOpen=0; finaleT=-1; finaleStep=0;
  shadow.on=false; shadowG.visible=false;
  bossSpiritG.visible=false; bossRise=0; bossRevealPend=false; bossSpirit.material.opacity=0; bossSpirit.material.color.setHex(0xffffff);
  atkT=0; shock.on=false; shockMesh.material.opacity=0; tel.on=false; tel.cd=3.2; telMesh.material.opacity=0;
  $('vbar').style.display='none';
  clearWaveFX();
  coreMark.material.opacity=0;
  diyas.forEach(d=>d.material.emissiveIntensity=0);
  yantraRings.forEach((r,i)=>r.material.opacity=YOP[i]);
  guardFace.material.emissiveIntensity=1.6;
  guardCore.material.emissiveIntensity=1.8;
  guardFace.material.emissive.setHex(0xc44536);
  guardCore.material.emissive.setHex(0xc44536);
  yantraRings[0].material.color.setHex(0xc44536);
  yantraRings[1].material.color.setHex(0x3ee8e0);
  yantraRings[2].material.color.setHex(0xc45a78);
  crystalDrop.material.emissive.setHex(0xc8ffe6); crystalDrop.material.emissiveIntensity=1.8;
  abilityUse.rudra=0; abilityUse.aadhya=0; abilityUse.ronit=0; abilityUse.ira=0;
  barrierMesh.visible=true;
  hiddenMesh.visible=true; hiddenMesh.material.opacity=1;
  bridgeMesh.material.emissive.setHex(0xff4a5a); bridgeMesh.material.emissiveIntensity=0.6; bridgeMesh.material.color.setHex(0x1c3028);
  gateGroup.visible=true;
  mechMark.material.opacity=0;
  sparks = SPARKS_DEF.map(([x,y],i)=>({x,y,taken:false,ph:i*2.1}));
  sparkMeshes.forEach(m=>m.visible=true);
  activeHero=0; poseT=0; lastAbilCd=0;
  heroModels.forEach((m,i)=>m.visible = i===0);
  playing=true; startT=performance.now();
  musicStart('explore');
  ['splash','results'].forEach(o=>$(o).classList.remove('show'));
  $('hud').style.display='flex'; $('heroes').style.display='flex'; $('objective').style.display='block';
  $('sparks').textContent='✿ 0 / 3';
  if (isTouch){ $('stick').style.display='block'; $('actbtn').style.display='block'; }
  refreshHeroBar(); updateObjective();
  toastHint(LB('Switch heroes: keys 1-4 or tap the portraits','Heroes switch: 1-4 keys ya portraits tap karo'), 3500);
}
// ============ TUTORIAL FLOW (ABHYAS-PRET trial — poora combat loop seekhao) ============
const STORY_EN='Neo-Varanasi, 2042. Three hybrids are loose on the ghats. Do not kill them. Calm them.';
const STORY_HI='Neo-Varanasi, 2042. Ghat pe teen hybrid khule hain. Unhe maarna nahi. Shaant karo.';
function applyLang(){
  $('b-lang').textContent='🌐 LANGUAGE: '+(LANG==='hi'?'HINGLISH':'ENGLISH');
  $('story').textContent=LANG==='hi'?STORY_HI:STORY_EN;
  $('b-tut').textContent=LANG==='hi'?'TUTORIAL — LADNA SEEKHO':'TUTORIAL — LEARN TO FIGHT';
}
$('b-lang').onclick=()=>{ LANG=(LANG==='hi'?'en':'hi'); try{localStorage.setItem('ananta_lang',LANG);}catch(e){} applyLang(); };
applyLang();
$('b-tut').onclick = ()=>{ ac(); startTutorial(); };
function startTutorial(){
  startRun(); // full reset reuse
  tutOn=true; tutStep=0; tutT=0; tutMove=0; tutSwapBase=swaps;
  echo.x=700; echo.y=745; echo.mode='idle';
  echo2.x=985; echo2.y=845; echo2.mode='idle';
  echoG.visible=true; echoCoreColor(0x9adfff);
  echo2G.visible=false; echo2Mark.visible=false; echo2CoreColor(0xff4a5a);
  drifter.g.visible=false; stalker.g.visible=false; mimic.gFake.visible=false;
  $('sparks').style.display='none'; $('patterns').style.display='none';
  tutMsg(L('STEP 1/7 — MOVE: use WASD / arrows / joystick','STEP 1/7 — MOVE: WASD / arrows / joystick se chalo'),
    L('TRAINING ARENA — ABHYAS-PRET, the bell-mist hybrid, is waiting. First, learn to move!','ABHYAS ARENA — ABHYAS-PRET, ghanti-dhundh ka hybrid, intezaar kar raha hai. Pehle chalna seekho!'));
}
function tutAbility(h){
  const d=Math.hypot(px-echo.x,py-echo.y);
  const d2=Math.hypot(px-echo2.x,py-echo2.y);
  if (tutStep<3){ toastHint(LB('No ability yet — finish the current step first!','Abhi ability nahi — pehle current step complete karo!')); sfx.deny(); return; }
  if (tutStep===3){ // IRA SCAN = READ
    if (h!=='ira'){ toastHint(LB('Switch to IRA [4] — only her SCAN can read a pattern','IRA [4] pe switch karo — sirf uska SCAN pattern read karta hai')); sfx.deny(); return; }
    abilCd=1.6; scanT=0; sfx.scan(); startDrishti();
    tutStep=4; echoCoreColor(0x3ee8a0);
    tutMsg(L('STEP 5/7 — COUNTER: switch to AADHYA [2], get CLOSE to the echo, press SPACE','STEP 5/7 — COUNTER: AADHYA [2] pe switch, echo ke PAAS ja ke SPACE'),
      L('SCAN LOCK — this pattern calms only to AADHYA and her SHAKTI RESTORE!','SCAN LOCK — ye pattern AADHYA ke SHAKTI RESTORE se shaant hoga!'));
    return;
  }
  if (tutStep===4){ // AADHYA = COUNTER
    if (h!=='aadhya'){ toastHint(LB('Wrong counter! The scan said: AADHYA [2] RESTORE is needed','Galat counter! Scan ne bola: AADHYA [2] ka RESTORE chahiye')); sfx.deny(); return; }
    if (d>140){ toastHint(LB('Aadhya: get closer to the echo','Aadhya: echo ke aur paas jao')); sfx.deny(); return; }
    abilCd=1.2; sfx.restore(); burst(echo.x,echo.y,0x3ee8a0,30,24); vineFX(echo.x,echo.y);
    echoG.visible=false; shake=10; sfx.collect();
    tutStep=5;
    echo2.x=px+190; echo2.y=py-70; echo2.mode='retreat'; echo2G.visible=true; echo2Mark.visible=true;
    flashFX('rgba(138,90,255,.35)', 350);
    tutMsg(L('STEP 6/7 — A flying CHHAYA artifact appeared. It hovers nearby — RONIT [3] + SPACE','STEP 6/7 — Udta CHHAYA artifact aaya. Ye paas hi hover karta hai — RONIT [3] + SPACE'),
      L('It will not fly out of range. Throw VEL, then RUDRA finishes it where the ring sits.','Ye range se bahar nahi udta. VEL throw karo, phir ring jahan hai wahan RUDRA finish karega.'));
    return;
  }
  if (tutStep===5){ // RONIT = RANGED (CHHAYA-PRET)
    if (h!=='ronit'){ toastHint(LB('A distant target needs RONIT [3] and his VEL throw','Door ke target ke liye RONIT [3] ka VEL throw chahiye')); sfx.deny(); return; }
    if (d2>320){ toastHint(LB('Ronit: come a little closer to the CHHAYA-PRET — range 320','Ronit: CHHAYA-PRET ke thoda paas aao — range 320')); sfx.deny(); return; }
    abilCd=1.2; echo2.mode='hold';
    velAnim={ t:0, fx:px, fz:py, tx:echo2.x, tz:echo2.y, hit:'echo2' };
    velMesh.visible=true;
    return;
  }
  if (tutStep===6){ // RUDRA = FINISH
    if (h!=='rudra'){ toastHint(LB('Only RUDRA [1] and his ASTRA FIST can seal the core','Core sirf RUDRA [1] ke ASTRA FIST se seal hoga')); sfx.deny(); return; }
    if (d2>120){ toastHint(LB('Rudra: get right next to the CHHAYA-PRET — punch range!','Rudra: CHHAYA-PRET ke bilkul paas jao — punch range!')); sfx.deny(); return; }
    abilCd=1.2; shake=12; sfx.break_();
    burst(echo2.x,echo2.y,0xffd98a,40,34); burst(echo2.x,echo2.y,0xb86bff,30,40);
    echo2G.visible=false; echo2Mark.visible=false; tutStep=7;
    endTutorial();
    return;
  }
  sfx.deny();
}
function endTutorial(){
  tutOn=false; playing=false;
  musicStop();
  $('sparks').style.display=''; $('patterns').style.display='';
  $('res-title').textContent='ABHYAS COMPLETE!';
  $('res-title').style.color='var(--cyan)';
  $('res-sub').textContent=L('You learned the full combat loop — DODGE, READ with IRA, pick the right COUNTER hero, use RONIT at range, finish with RUDRA and the ASTRA FIST. The same loop beats every creature and the boss. Ready?','Tumne poora combat loop seekh liya — DODGE, phir IRA ka SCAN (read), phir sahi COUNTER hero, door walo pe RONIT, aur RUDRA ka ASTRA FIST finish. Yahi loop asli creatures aur boss pe chalega. Ready ho?');
  $('res-stats').textContent=L('TRAINING ECHO SEALED · the real breach is waiting for you','TRAINING ECHO SEALED · ab asli breach tumhara intezaar kar raha hai');
  $('b-again').textContent='ENTER THE BREACH';
  $('results').classList.add('show');
  $('hud').style.display='none'; $('heroes').style.display='none'; $('objective').style.display='none';
  $('hint').style.display='none'; $('stick').style.display='none'; $('actbtn').style.display='none';
  sfx.win();
}

function endRun(won=true){
  playing=false;
  musicStop();
  const secs=((performance.now()-startT)/1000).toFixed(1);
  const grade=(contained===3 && got===3 && stability>=70)?'S':(contained>=2 && got>=2)?'A':(contained+got>=2)?'B':'C';
  if (won){
    $('results').style.background="linear-gradient(to bottom, rgba(7,5,14,.3), rgba(10,8,18,.85)), url('assets/cine/ending.jpg') center/cover no-repeat";
    $('res-title').textContent='BREACH SECURED';
    $('res-title').style.color='var(--gold)';
    $('res-sub').textContent=L('The Guardian rests. The breach is sealed. The lonely pattern became the fifth — SAATH, together. Sector 7 breathes again, because four guardians stood as one.','Guardian shaant. Breach band. Wo akela pattern ab paanchwa ban gaya — SAATH. Sector 7 phir saans le raha hai, chaaron guardians ki wajah se.');
    sfx.win();
    // Ending narration is sequenced before the watcher in startStinger().
  } else {
    $('results').style.background='';
    $('res-title').textContent='TEAM DESTABILIZED';
    $('res-title').style.color='var(--red)';
    $('res-sub').textContent=L('Stability lost. Remember — every pattern has a counter-hero: Drifter→Ira Scan, Stalker→Aadhya Restore, Mimic→Ronit Vel.','Stability khatam. Yaad rakho — har pattern ka ek counter-hero hai: Drifter→Ira ka Scan, Stalker→Aadhya ka Restore, Mimic→Ronit ka Vel.');
    sfx.deny();
  }
  const night={rudra:['Night of the Fist','Mukke ki raat'],aadhya:['Night of the Leaf','Patte ki raat'],ronit:['Night of the Vel','Vel ki raat'],ira:['Night of the Scan','Scan ki raat']};
  let nightId='rudra', nightN=-1;
  for (const k of ['rudra','aadhya','ronit','ira']){ if (abilityUse[k]>nightN){ nightN=abilityUse[k]; nightId=k; } }
  $('res-stats').textContent=`${L(night[nightId][0], night[nightId][1])} · MASH RATING ${grade} · time ${secs}s · ✿ ${got}/3 kamal · ◈ ${contained}/3 patterns · ⚡ resonance ×${resonCount} · swaps ${swaps} · stability ${stability}%`;
  if (won){
    // best record save (replay chase)
    try{
      const rank={S:4,A:3,B:2,C:1};
      const prev=JSON.parse(localStorage.getItem('ananta_best')||'null');
      if (!prev || rank[grade]>rank[prev.grade] || (grade===prev.grade && parseFloat(secs)<parseFloat(prev.secs)))
        localStorage.setItem('ananta_best', JSON.stringify({grade, secs}));
    }catch(e){}
    updateBestRec();
    $('res-stats').textContent += grade==='S'
      ? L(' · PERFECT MASH! Can you go even faster?',' · PERFECT MASH! Aur tez kar sakte ho?')
      : L(' · Can you reach S rank?',' · Kya S rank aa sakta hai?');
  }
  $('hud').style.display='none'; $('heroes').style.display='none'; $('objective').style.display='none';
  $('hint').style.display='none'; $('stick').style.display='none'; $('actbtn').style.display='none';
  $('vbar').style.display='none';
  // win = post-credits stinger pehle, phir results; lose = seedha results
  if (won) startStinger(); else $('results').classList.add('show');
}

// ============ LOOP ============
const clock = new THREE.Clock();
let camX=700, camZ=880;
function animate(){
  requestAnimationFrame(animate);
  const rawdt=Math.min(0.05, clock.getDelta());
  if (slowT>0) slowT-=rawdt;
  const dt = rawdt * (slowT>0 ? 0.38 : 1);
  const t=clock.elapsedTime;
  perfTick(dt);

  // ambient
  waterTexes.forEach(w=>{ w.offset.x+=dt*0.012; w.offset.y+=dt*0.006; });
  yantraRings.forEach((r,i)=>{ r.rotation.z += dt*(i%2?-0.3:0.22); });
  if (bossOn && bossRevealPend && Math.hypot(px-DAIS.x, py-(DAIS.y-155))<330){
    bossRevealPend=false; bossSpiritG.visible=true; bossRise=0;
    shake=18; flashFX('rgba(180,120,255,.45)', 450); sfx.break_(); sfx.bell();
    toastHint(LB('THE GUARDIAN REVEALS ITS TRUE FORM!','GUARDIAN ka ASLI ROOP saamne aa gaya!'), 3200);
  }
  if (bossSpiritG.visible){
    bossRise=Math.min(1, bossRise+dt/2.4);
    const be=1-Math.pow(1-bossRise,3);
    bossSpirit.position.y = -30+be*70 + Math.sin(t*1.4)*8;
    if (bossDone) { bossSpirit.material.opacity=Math.max(0, bossSpirit.material.opacity-dt*0.45);
      if (bossSpirit.material.opacity<=0.01) bossSpiritG.visible=false; }
    else bossSpirit.material.opacity=Math.min(0.95, be);
  }
  crystal.rotation.y=t*0.8; crystal.position.y=70+Math.sin(t*1.6)*6;
  breachLight.intensity=22000+Math.sin(t*2.2)*4000;
  sparkMeshes.forEach((m,i)=>{
    const s=sparks[i]; if(!s||s.taken){ m.visible=false; return; }
    m.rotation.y=t*1.6+s.ph; m.position.y=26+Math.sin(t*2+s.ph)*5;
  });
  for (let vi=vinesFX.length-1; vi>=0; vi--){
    const v=vinesFX[vi]; v.t+=dt;
    if (v.t<0.28) v.g.scale.y=Math.max(0.02, v.t/0.28);
    else if (v.t>1.15){
      const op=Math.max(0, 1-(v.t-1.15)/0.5);
      v.g.children.forEach(c=>c.material.opacity=op*0.95);
      if (op<=0){ scene3.remove(v.g); vinesFX.splice(vi,1); }
    }
  }
  for (let j=0;j<MAXP;j++){
    if (pLife[j]<=0){ pPos[j*3+1]=-9999; continue; }
    pLife[j]-=dt*1.3;
    pPos[j*3]+=pVel[j*3]*dt; pPos[j*3+1]+=pVel[j*3+1]*dt; pPos[j*3+2]+=pVel[j*3+2]*dt;
    pVel[j*3+1]-=300*dt;
  }
  pGeo.attributes.position.needsUpdate=true;

  if (!playing){ composer.render(); return; }

  abilCd=Math.max(0,abilCd-dt);
  hurtCd=Math.max(0,hurtCd-dt);
  $('abilcd').textContent = abilCd>0 ? 'CHARGING…' : HEROES[activeHero].nm+' READY';
  $('abilcd').style.color = abilCd>0 ? '#71658f' : HEROES[activeHero].col;

  // movement
  let mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+stickV.x;
  let my=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)+stickV.y;
  const ml=Math.hypot(mx,my); if(ml>1){mx/=ml;my/=ml;}
  const spd=290; // pacing: faster movement
  const nx=px+mx*spd*dt, ny=py+my*spd*dt;
  if (!solidAt(nx,py)) px=nx;
  if (!solidAt(px,ny)) py=ny;
  if (ml>0.1) faceAngle += (Math.atan2(mx,my)-faceAngle)*Math.min(1,dt*10);

  // Ira scan ring
  if (scanT>=0){
    scanT+=dt;
    const R=scanT*420;
    scanRing.position.x=px; scanRing.position.z=py;
    scanRing.scale.set(R,R,1);
    scanRing.material.opacity=Math.max(0,0.75-scanT*0.55);
    // reveal hidden wall
    if (!tutOn && !hiddenOpen){
      const hx=HIDDEN[0]+18, hy=HIDDEN[1]+40;
      if (Math.hypot(px-hx,py-hy)<R && Math.hypot(px-hx,py-hy)<340){
        hiddenA=Math.max(0,hiddenA-dt*2.2);
        hiddenMesh.material.opacity=hiddenA;
        hiddenMesh.material.emissiveIntensity=(1-hiddenA)*0.9;
        if (hiddenA<=0.3 && !hiddenOpen){ hiddenOpen=true; hiddenMesh.visible=false; toastHint(LB('IRA SCAN — hidden path found! (west alcove)','IRA SCAN — chhupa raasta mila! (west alcove)')); }
      }
    }
    // reveal mech
    if (!tutOn && !mechSeen && Math.hypot(px-MECH.x,py-MECH.y)<Math.min(R,360)){
      mechSeen=true; mechMark.material.opacity=0.85;
      toastHint(LB('IRA SCAN — bell mechanism located! This is a job for Ronit.','IRA SCAN — bell mechanism located! Ronit ka kaam hai ab.'));
      updateObjective();
    }
    // contain drifter (lantern × ghost — scan hi iska counter hai)
    if (!tutOn && drifter.state!=='contained'){
      const ddr=Math.hypot(px-drifter.x,py-drifter.y);
      if (ddr<Math.min(R,340)) containCreature(drifter);
    }
    // BOSS: drifter-pattern wisps containment (READ ke BAAD doosre scan se)
    if (bossOn && wave && wave.type==='drifter' && wave.read && !wave.justRead){
      let anyAlive=false;
      wisps.forEach(w=>{
        if (!w.alive) return;
        if (Math.hypot(px-w.x,py-w.y)<Math.min(R,340)){
          w.alive=false; w.g.visible=false;
          burst(w.x,w.y,0x9adfff,20,24); sfx.contain();
        }
        if (w.alive) anyAlive=true;
      });
      if (!anyAlive) clearWave();
    }
    if (scanT>1.4){ scanT=-1; scanRing.material.opacity=0; if (bossOn && wave) wave.justRead=false; }
  }
  // ---- BOSS ATTACKS (Guardian ladta hai!) ----
  if (bossOn && !bossDone && playing && wave){
    atkT+=dt;
    const iv = wave.type==='bell' ? 3.8 : 6.0;
    if (!shock.on && atkT>iv){
      atkT=0; shock.on=true; shock.r=36; shock.hit=false; sfx.bell();
      shockMesh.position.set(CORE_POS.x,3,CORE_POS.y);
    }
    if (wave.type==='vine'){
      tel.cd-=dt;
      if (!tel.on && tel.cd<=0){ tel.on=true; tel.t=0.95; tel.x=px; tel.y=py; tel.cd=4.0; }
    }
  }
  if (shock.on){
    shock.r += dt * (bossOn && wave && wave.type==='bell' ? 330 : 245);
    shockMesh.scale.set(shock.r,shock.r,1);
    shockMesh.material.opacity=Math.max(0, 0.62*(1-shock.r/760));
    const sd=Math.hypot(px-CORE_POS.x,py-CORE_POS.y);
    if (!shock.hit && Math.abs(sd-shock.r)<26){ shock.hit=true; hurt(9, CORE_POS.x, CORE_POS.y); }
    if (shock.r>760 || !bossOn || bossDone){ shock.on=false; shockMesh.material.opacity=0; }
  }
  if (tel.on){
    tel.t-=dt;
    telMesh.position.set(tel.x,2.5,tel.y);
    telMesh.material.opacity=0.25+0.45*Math.abs(Math.sin(t*14));
    if (tel.t<=0 || !bossOn || bossDone){
      tel.on=false; telMesh.material.opacity=0;
      if (bossOn && !bossDone){
        burst(tel.x,tel.y,0xff4a5a,30,30); shake=8; sfx.break_();
        if (Math.hypot(px-tel.x,py-tel.y)<72) hurt(10, tel.x, tel.y);
      }
    }
  }
  // ---- ASTRA DRISHTI world-state ----
  if (drishtiT>0){
    drishtiT-=dt; drishtiGlow=true;
    [drifter,stalker,mimic].forEach(c=>{
      const g=(c.id==='mimic' && c.state==='disguised') ? c.gFake : c.g;
      const gl=(g&&g.getObjectByName)?g.getObjectByName('glow'):null;
      if (gl && c.state!=='contained'){
        if (gl.userData.oc===undefined){ gl.userData.oc=gl.material.color.getHex(); gl.userData.oo=gl.material.opacity; }
        gl.material.color.setHex(CCOL[c.id]);
        gl.material.opacity=0.5+0.3*Math.sin(t*6);
      }
    });
    if (drishtiT<=0) $('drishti').classList.remove('on');
  } else if (drishtiGlow){
    drishtiGlow=false;
    [drifter,stalker,mimic].forEach(c=>{
      [c.g,c.gFake].forEach(g=>{
        const gl=(g&&g.getObjectByName)?g.getObjectByName('glow'):null;
        if (gl && gl.userData.oc!==undefined){ gl.material.color.setHex(gl.userData.oc); gl.material.opacity=gl.userData.oo; }
      });
    });
  }
  if (resonT>0){ resonT=Math.max(0,resonT-dt); $('rz').style.opacity = resonT>0 ? (0.2+0.5*resonT/3) : 0; }
  if (mechSeen) mechMark.rotation.z += dt*1.4;

  // hybrid creatures (Monster Mash core)
  if (!tutOn) updateCreatures(dt, t);
  if (!playing){ composer.render(); return; }

  // ---------- TUTORIAL UPDATE (ABHYAS-PRET) ----------
  if (tutOn){
    tutT+=dt;
    const flick=0.72+Math.sin(t*17)*0.12+Math.sin(t*5.3)*0.08;
    const espr=echoG.getObjectByName('cspr');
    if (espr) espr.material.opacity=0.94+Math.sin(t*5)*0.04;
    echoG.getObjectByName('ering').rotation.z=t*1.3;
    echoG.rotation.y=0;
    echoG.position.set(echo.x, Math.sin(t*2.2)*1.1, echo.y);
    if (echo2G.visible){
      const fly=echo2.mode==='hold' ? 9+Math.sin(t*2)*1.1 : 23+Math.sin(t*3.2)*3.2;
      echo2G.position.set(echo2.x, fly, echo2.y);
      echo2G.rotation.z=Math.sin(t*2.4)*0.06;
      echo2Mark.visible=true; echo2Mark.position.set(echo2.x, 1.7, echo2.y); echo2Mark.rotation.z=t*1.5;
      if (echo2.mode==='retreat'){
        const dx=echo2.x-px, dy=echo2.y-py, ed=Math.hypot(dx,dy)||1;
        const ang=Math.atan2(dy,dx)+dt*0.65;
        const tx=px+Math.cos(ang)*210, ty=py+Math.sin(ang)*210;
        echo2.x+=(tx-echo2.x)*Math.min(1, dt*2.4);
        echo2.y+=(ty-echo2.y)*Math.min(1, dt*2.4);
        echo2.x=Math.min(1040, Math.max(400, echo2.x));
        echo2.y=Math.min(1000, Math.max(540, echo2.y));
        const d3=Math.hypot(echo2.x-px, echo2.y-py)||1;
        if (d3>280){ echo2.x=px+(echo2.x-px)/d3*240; echo2.y=py+(echo2.y-py)/d3*240; }
      }
    } else echo2Mark.visible=false;
    if (tutStep===0){ // MOVE
      tutMove += ml*290*dt;
      if (tutMove>110){ tutStep=1; sfx.collect();
        tutMsg(L('STEP 2/7 — SWITCH: keys 1-4 or tap the portraits below','STEP 2/7 — SWITCH: 1-4 keys ya neeche portraits tap karo'),
          L('Four guardians, four powers — try switching to another hero','Char guardians, char powers — kisi bhi doosre hero pe switch karke dekho')); }
    } else if (tutStep===1){ // SWITCH
      if (swaps>tutSwapBase){ tutStep=2; tutT=0; sfx.collect();
        echo.mode='chase'; echoCoreColor(0xff4a5a);
        tutMsg(L('STEP 3/7 — DODGE: the ABHYAS-PRET is coming — survive 5 seconds!','STEP 3/7 — DODGE: ABHYAS-PRET aa raha hai — 5 second BACHO!'),
          L('Its touch drains stability. Run and dodge — the first rule of every fight!','Touch hua toh stability girti hai. Bhaag ke dodge karo — ye fight ka pehla rule hai!')); }
    } else if (tutStep===2){ // DODGE survive
      if (tutT>4.5){ tutStep=3; sfx.collect();
        echo.mode='circle'; echoCoreColor(0x9adfff);
        tutMsg(L('STEP 4/7 — READ: switch to IRA [4], then press SPACE to SCAN','STEP 4/7 — READ: IRA [4] pe switch karo, phir SPACE se SCAN'),
          L('Every pattern has a COUNTER-hero — IRA and her SCAN reveal it','Har pattern ka ek COUNTER-hero hota hai — IRA ka SCAN use reveal karta hai')); }
    }
    // echo movement
    if (echo.mode==='chase'){
      const ed=Math.hypot(px-echo.x,py-echo.y)||1;
      echo.x+=(px-echo.x)/ed*150*dt; echo.y+=(py-echo.y)/ed*150*dt;
      if (ed<pr+22) hurt(4, echo.x, echo.y);
    } else if (echo.mode==='circle'){
      const ea=t*0.8, ecx=700+Math.cos(ea)*70, ecy=800+Math.sin(ea)*40;
      echo.x+=(ecx-echo.x)*dt*2; echo.y+=(ecy-echo.y)*dt*2;
    } else if (echo.mode==='retreat'){
      echo.x+=(960-echo.x)*dt*2.4; echo.y+=(845-echo.y)*dt*2.4;
    }
    // tutorial mein lose nahi hota — stability floor
    if (stability<30){ stability=30; updateStabHud();
      toastHint(LB('In the tutorial stability never drops below 30 — in a REAL run 0 = LOSE!','Tutorial mein stability 30 se neeche nahi girti — REAL run mein 0 = LOSE!'), 3200); }
  }

  // Ronit vel projectile (target: mech ya mimic)
  if (velAnim){
    velAnim.t+=dt*2.2;
    const k=Math.min(1,velAnim.t);
    const vx=velAnim.fx+(velAnim.tx-velAnim.fx)*k, vz=velAnim.fz+(velAnim.tz-velAnim.fz)*k;
    velMesh.position.set(vx, 40+Math.sin(k*Math.PI)*30, vz);
    if (Math.random()<0.85) burst(vx, vz, 0xff4a5a, 2, 8);
    velMesh.rotation.z=Math.atan2(velAnim.tx-velAnim.fx, velAnim.tz-velAnim.fz);
    velMesh.rotation.x=Math.PI/2;
    if (k>=1){
      const hitType=velAnim.hit;
      velAnim=null; velMesh.visible=false;
      if (hitType==='mech'){
        mechOn=true; shake=10; sfx.bell();
        mechGroup.getObjectByName('bell').material.emissiveIntensity=2.4;
        gateGroup.visible=false;
        burst(MECH.x,MECH.y,0xff4a5a,30,55);
        burst(GATE[0]+60,GATE[1]+18,0xff4a3a,26,30);
        toastHint(LB('VEL PRECISION! The bell rang — THE GATE IS OPEN!','VEL PRECISION! Bell baja — GATE KHUL GAYA!'));
        updateObjective();
      } else if (hitType==='mimic'){
        sfx.bell(); shake=8;
        burst(mimic.x,mimic.y,0xff4a5a,26,26);
        containCreature(mimic);
      } else if (hitType==='bossbell'){
        sfx.bell(); shake=9;
        burst(CORE_POS.x,CORE_POS.y,0xff4a5a,34,50);
        if (bossOn && wave && wave.type==='bell') clearWave();
      } else if (hitType==='echo2'){
        sfx.bell(); shake=8;
        burst(echo2.x,echo2.y,0xff4a5a,26,26);
        if (tutOn && tutStep===5){
          tutStep=6; echo2.mode='hold'; echo2CoreColor(0xffb347);
          tutMsg(L('STEP 7/7 — FINISH: switch to RUDRA [1], get close — ASTRA FIST (SPACE)','STEP 7/7 — FINISH: RUDRA [1] pe switch, paas ja ke ASTRA FIST (SPACE)'),
            L('VEL HIT! The CHHAYA-PRET staggered, its core is exposed — RUDRA and his punch will SEAL it!','VEL HIT! CHHAYA-PRET stagger hua, core expose — RUDRA ka punch ise SEAL karega!'));
        }
      }
    }
  }

  // sparks
  for (let i=0;i<sparks.length;i++){
    const s=sparks[i];
    if (s.taken) continue;
    if (Math.hypot(px-s.x,py-s.y)<pr+16){
      s.taken=true; got++; sfx.collect(); shake=5;
      $('sparks').textContent=`✿ ${got} / 3`;
      burst(s.x,s.y,0xf4c9d4,18,26); burst(s.x,s.y,0xc8ffe6,10,18);
      toastHint(LB('KAMAL — a lotus holding amrit. '+got+'/3','KAMAL mila — amrit ka kamal. '+got+'/3'), 1800);
    }
  }
  // boss trigger — dais pe pahunchte hi Guardian jaagta hai (win ab finale se hota hai)
  if (mechOn && !bossOn && !bossDone && Math.hypot(px-DAIS.x,py-DAIS.y)<DAIS.r+30){
    startBoss();
  }
  updateBoss(dt, t);
  if (!playing){ composer.render(); return; }

  // active hero billboard
  const hm=heroModels[activeHero];
  hm.position.set(px,0,py);
  const spr=hm.getObjectByName('spr');
  if (spr){
    // direction flip
    if (mx>0.12) hm.userData.face=1; else if (mx<-0.12) hm.userData.face=-1;
    // ability pose flash
    if (abilCd>lastAbilCd+0.05){ poseT=0.7; flashFX('rgba(255,217,138,.35)', 220); }
    lastAbilCd=abilCd;
    if (poseT>0) poseT-=dt;
    // cel-animation frame select: ability > walk cycle > idle
    let fkey='_idle';
    if (poseT>0) fkey='_ability';
    else if (ml>0.1) fkey=(Math.floor(t*6)%2)?'_walkA':'_walkB';
    const want=SPR[HEROES[activeHero].id+fkey];
    if (spr.material.map!==want){ spr.material.map=want; spr.material.needsUpdate=true; }
    const img=spr.material.map.image;
    const ar=(img&&img.width)?img.width/img.height:0.38;
    spr.scale.set(84*ar*hm.userData.face, 84, 1);
    // subtle bob (frames carry the stride)
    spr.position.y=1.2+(ml>0.1?Math.abs(Math.sin(t*9))*1.6:Math.sin(t*2)*1.1);
  }
  const ring=hm.getObjectByName('ring');
  if (ring){ ring.rotation.z=t*2; }

  if (shake>0) shake=Math.max(0,shake-dt*34);
  camX+=(px-camX)*Math.min(1,dt*4);
  camZ+=(py-camZ)*Math.min(1,dt*4);
  camera.position.set(camX+(Math.random()-.5)*shake, 430+(Math.random()-.5)*shake, camZ+310+(Math.random()-.5)*shake);
  camera.lookAt(camX,10,camZ);
  composer.render();
}
animate();
