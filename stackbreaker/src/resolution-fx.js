// Stackbreaker resolution visual vocabulary — no game-state mutations.
// Gameplay modes require observed state changes; preview-only modes are opt-in
// explicit fixtures and never add new legal Magic actions.
const positive=(n)=>Number.isFinite(n)&&n>0;
export const SPELL_FX_MODES=[
 'heal','exile','summon','bounce','shield','destroy','wipe','damage-wave',
 'buff','weaken','draw','counters','token','reanimate','tap','untap','copy','scry'
];
export const PREVIEW_ONLY_FX=new Set(['draw','token','reanimate','copy','scry','untap']);
const palette={W:'#fff0ab',U:'#77d0ff',B:'#caa0ec',R:'#ff7c45',G:'#a0f495',C:'#dadfdd'};
export function spellColor(colors){
 if(!Array.isArray(colors)||!colors.length)return palette.C;
 return palette[colors.find(c=>palette[c])||'C'];
}
export function observeResolutionChanges(before,after){
 const unitsBefore=before?.units||[],unitsAfter=after?.units||[];
 const old=new Map(unitsBefore.map(x=>[x.id,x]));
 const changes=[];
 for(const unit of unitsAfter){
  const prior=old.get(unit.id);
  if(!prior){if(unit.zone==='battlefield')changes.push({id:unit.id,card:unit.card,kind:'entered',controller:unit.controller});continue;}
  if(prior.zone!==unit.zone)changes.push({id:unit.id,card:unit.card,kind:'zone',from:prior.zone,to:unit.zone,controller:unit.controller});
  else if(unit.zone==='battlefield'){
   const deltaP=(unit.powerBoost||0)-(prior.powerBoost||0);
   const deltaT=(unit.toughnessBoost||0)-(prior.toughnessBoost||0);
   if(deltaP||deltaT)changes.push({id:unit.id,card:unit.card,kind:'pt',power:deltaP,toughness:deltaT,controller:unit.controller});
   if((!prior.hexproof&&unit.hexproof)||(!prior.indestructible&&unit.indestructible))
    changes.push({id:unit.id,card:unit.card,kind:'protected',controller:unit.controller});
  }
 }
 return {
  life:{
   player:(after?.life?.player||0)-(before?.life?.player||0),
   opponent:(after?.life?.opponent||0)-(before?.life?.opponent||0)
  },
  units:changes
 };
}
const has=(e,kind,condition=()=>true)=>e.changes?.units?.some(x=>x.kind===kind&&condition(x));
export function resolutionFxMode(event){
 if(!event)return 'none';
 // Fixture-only modes are injected solely by the separately labeled VFX Lab.
 if(event.visualFixture===true && SPELL_FX_MODES.includes(event.fxType))
  return event.fxType;
 if(event.outcome==='invalid-target'||event.outcome==='countered'||event.outcome==='uncounterable')return 'none';
 if(event.effect==='heal'||event.effect==='sacGain')return event.changes?.life&&
  Object.values(event.changes.life).some(positive)?'heal':'none';
 if(event.effect==='exile'&&has(event,'zone',x=>x.to==='exile'))return 'exile';
 if((event.effect==='bounce'||event.effect==='vapor')&&has(event,'zone',x=>x.to==='hand'))return 'bounce';
 if(event.isCreatureSpell&&has(event,'entered'))return 'summon';
 if(event.effect==='destroyAll'&&has(event,'zone',x=>x.to==='graveyard'))return 'wipe';
 if((event.effect==='weakenAll'||event.effect==='sweepDamage')&&
    event.outcome==='resolved')return 'damage-wave';
 if(event.effect==='destroy'&&has(event,'zone',x=>x.to==='graveyard'))return 'destroy';
 if(['ward','intervention','preventSpellDamage','safekeeping'].includes(event.effect)&&
  (has(event,'protected')||event.effect==='preventSpellDamage'))return 'shield';
 if(['pump','blossom','dive','boostHexproof'].includes(event.effect)&&has(event,'pt',x=>x.power>0||x.toughness>0))
  return event.card==='Snakeskin Veil'?'counters':'buff';
 if(['shrink','weakenAll'].includes(event.effect)&&has(event,'pt',x=>x.power<0||x.toughness<0))return 'weaken';
 if(event.effect==='heal'&&Object.values(event.changes?.life||{}).some(positive))return 'heal';
 if(event.fxType==='tap'&&event.verifiedTap===true)return 'tap';
 return 'none';
}
export function fxNarration(event,mode){
 if(!event||mode==='none')return '';
 const prefix=event.card||'Spell';
 const map={
  heal:'life increases',exile:'target is exiled',summon:'creature enters the battlefield',
  bounce:'target returns to hand',shield:'protection is granted',
  destroy:'creature is destroyed',wipe:'creatures are destroyed across the battlefield',
  'damage-wave':'a battlefield-wide effect resolves',buff:'creature stats increase',
  weaken:'creature stats decrease',counters:'a +1/+1 modifier is applied',
  draw:'cards move from library to hand',token:'tokens appear',
  reanimate:'creature returns from graveyard',tap:'land is tapped',
  untap:'permanent untaps',copy:'spell copy appears',scry:'cards are examined and reordered'
 };
 return prefix+': '+(map[mode]||'effect resolves')+'.';
}
const px=x=>Math.round(x*10)/10+'px';
const boxBounds=(p,view)=>{
 const w=view?.innerWidth||view?.document?.documentElement?.clientWidth||1000;
 const h=view?.innerHeight||view?.document?.documentElement?.clientHeight||720;
 return {x:Math.max(18,Math.min(w-18,p.x)),y:Math.max(18,Math.min(h-18,p.y))};
};
const el=(root,tag,cls,container)=>{
 const node=root.createElement(tag);node.className=cls;container.appendChild(node);return node;
};
export function renderResolutionFx(root,layer,view,event,anchors,mode){
 if(!SPELL_FX_MODES.includes(mode)||!anchors?.source||!root?.createElement)return null;
 const center=anchors.target||anchors.field||anchors.source;
 const focus=boxBounds(center,view);
 const source=boxBounds(anchors.source,view);
 layer.setAttribute('data-spell-fx',mode);
 layer.style.setProperty?.('--spell-hue',spellColor(event.colors));
 const scene=el(root,'div','sb-fx-scene sb-fx-'+mode,layer);
 scene.setAttribute('aria-hidden','true');
 const color=event.colors?.find(c=>['W','U','B','R','G'].includes(c))||'C';
 scene.setAttribute('data-fx-color',color);
 scene.style.setProperty?.('--spell-hue',spellColor(event.colors));
 const family={
  heal:'✦',exile:'◇',summon:'✧',bounce:'↶',shield:'⬡',destroy:'✕',
  wipe:'✺','damage-wave':'◉',buff:'✦',weaken:'▽',draw:'◈',
  counters:'+1/+1',token:'✧',reanimate:'☽',tap:'◉',untap:'✧',copy:'⊞',scry:'◈'
 };
 const pulse=(point,variant=mode,delay=0)=>{
  const n=el(root,'div','sb-fx-pulse sb-fx-'+variant,scene);
  const at=boxBounds(point,view);
  n.style.left=px(at.x);n.style.top=px(at.y);
  n.style.setProperty?.('--fx-delay',delay+'ms');
  const rune=el(root,'span','sb-fx-rune',n);rune.textContent=family[variant]||'✦';
  return n;
 };
 const sourcePoint=pulse(source,'origin');
 const impact=pulse(focus,mode,130);
 // Linear tracer travels from a spell on the stack toward its authoritative target.
 const dx=focus.x-source.x,dy=focus.y-source.y,dist=Math.hypot(dx,dy);
 if(dist>5&&!['wipe','damage-wave'].includes(mode)){
  const beam=el(root,'div','sb-fx-travel sb-fx-'+mode,scene);
  beam.style.left=px(source.x);beam.style.top=px(source.y);
  beam.style.width=px(dist);
  beam.style.transform='translateY(-50%) rotate('+Math.atan2(dy,dx)+'rad)';
 }
 const counts=mode==='wipe'||mode==='damage-wave'?anchors.affected?.length||0:0;
 const locations=mode==='wipe'||mode==='damage-wave'?
  (anchors.affected?.length?anchors.affected:[focus]):[focus];
 locations.slice(0,16).forEach((pt,j)=>{
  const p=boxBounds(pt,view);
  if(counts)pulse(p,mode,j*40);
  const num=(view?.innerWidth||1000)<480?7:11;
  for(let i=0;i<num;i++){
   const particle=el(root,'i','sb-fx-particle',scene);
   const a=(i/num)*Math.PI*2+j*.35;
   const spread=25+(i%4)*15;
   particle.style.left=px(p.x);particle.style.top=px(p.y);
   particle.style.setProperty?.('--fx-dx',px(Math.cos(a)*spread));
   particle.style.setProperty?.('--fx-dy',px(Math.sin(a)*spread));
   particle.style.setProperty?.('--fx-delay',(j*40+(i%4)*32)+'ms');
  }
 });
 const countsPositive=Object.entries(event.changes?.life||{}).filter(([k,v])=>positive(v));
 const label=mode==='heal'&&countsPositive.length?
  '+'+countsPositive.map(([name,n])=>n).reduce((a,b)=>a+b,0):
  mode==='counters'?'+1/+1':mode==='draw'?'DRAW':mode==='scry'?'SCRY':
  mode==='copy'?'COPY':mode==='token'?'TOKEN':null;
 if(label){
  const t=el(root,'span','sb-fx-caption',scene);
  t.style.left=px(focus.x);t.style.top=px(focus.y-33);
  t.textContent=label;
 }
 if(mode==='wipe'||mode==='damage-wave'){
  const wave=el(root,'div','sb-fx-wave',scene);
  wave.style.left=px(focus.x);wave.style.top=px(focus.y);
 }
 return scene;
}
