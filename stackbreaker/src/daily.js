import dailyManifest from '../data/daily-manifest.json' with {type:'json'};
export const DAILY_STORAGE_KEY='dc-stackbreaker-daily-local-v1';
export const DAILY_MANIFEST=dailyManifest;
const iso=/^\d{4}-\d{2}-\d{2}$/;
export function dailyUtcDate(now=Date.now()){
 const time=now instanceof Date?now.getTime():Number(now);
 if(!Number.isFinite(time))throw new RangeError('Invalid daily clock');
 return new Date(time).toISOString().slice(0,10);
}
export function millisUntilUtcReset(now=Date.now()){
 const ms=now instanceof Date?now.getTime():Number(now);
 if(!Number.isFinite(ms))throw new RangeError('Invalid daily clock');
 const day=86400000;
 return day-(ms%day+day)%day;
}
export function dailyCountdown(now=Date.now()){
 const s=Math.max(0,Math.floor(millisUntilUtcReset(now)/1000));
 return [Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(x=>String(x).padStart(2,'0')).join(':');
}
export function dailyEntryForDate(utcDate,manifest=DAILY_MANIFEST){
 if(!iso.test(String(utcDate)))return null;
 return manifest.entries.find(x=>x.utcDate===utcDate)||null;
}
// Deterministic content fingerprint for the LOCAL game only; it is NOT an
// authenticated SHA-256, score proof, or replacement for website verification.
export function localScenarioFingerprint(scenario){
 if(!scenario||!scenario.id)return null;
 const text=JSON.stringify(scenario);
 let hash=2166136261;
 for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
 return 'fnv1a32-'+(hash>>>0).toString(16).padStart(8,'0');
}
export function bindDailyScenario(entry,scenarios){
 if(!entry)return null;
 const scenario=scenarios.find(x=>x.id===entry.puzzleId&&x.version===entry.rulesVersion);
 if(!scenario)return null;
 return {...entry,scenarioDigest:localScenarioFingerprint(scenario),scenario};
}
export function localDailyStart(entry,state,now=Date.now()){
 if(!entry||!state||!state.id||entry.puzzleId!==state.id)throw Error('Daily puzzle mismatch');
 return {
  schemaVersion:1,utcDate:entry.utcDate,puzzleId:entry.puzzleId,
  puzzleRevision:entry.puzzleRevision,manifestVersion:entry.manifestVersion,
  rulesVersion:entry.rulesVersion,scenarioDigest:entry.scenarioDigest,
  localUnverified:true,startedAt:new Date(now).toISOString(),status:'playing',
  completed:false,acceptedActionCount:0,castAndActivationCount:0,
  priorityPassCount:0,hintUsed:false,undoUsed:false,state:structuredClone(state)
 };
}
export function dailyAcceptedTransition(record,before,after){
 if(!record||record.status!=='playing'||before?.status!=='playing'||!after)return record;
 if(JSON.stringify(before)===JSON.stringify(after))return record;
 let kind='action';
 if(after.step!==before.step)kind='pass';
 else if(after.used?.length>before.used?.length)kind='cast';
 else if(after.lands?.some((l,i)=>l.tapped&&!before.lands?.[i]?.tapped))kind='tap';
 else if(after.lands?.length!==before.lands?.length||after.used?.length>before.used?.length)kind='cast';
 return {
  ...record,acceptedActionCount:record.acceptedActionCount+1,
  castAndActivationCount:record.castAndActivationCount+(kind==='cast'?1:0),
  priorityPassCount:record.priorityPassCount+(kind==='pass'?1:0),
  status:after.status==='won'?'won':after.status==='lost'?'lost':'playing',
  completed:after.status==='won',
  state:structuredClone(after)
 };
}
export function safeDailyLoad(raw,entry){
 if(!raw||!entry||typeof raw!=='object')return null;
 if(raw.schemaVersion!==1||raw.utcDate!==entry.utcDate||raw.puzzleId!==entry.puzzleId||
  raw.rulesVersion!==entry.rulesVersion||raw.puzzleRevision!==entry.puzzleRevision||
  raw.scenarioDigest!==entry.scenarioDigest)return null;
 if(!['playing','won','lost','expired'].includes(raw.status)||
  !Number.isSafeInteger(raw.acceptedActionCount)||raw.acceptedActionCount<0||
  !raw.state||raw.state.id!==entry.puzzleId||!Array.isArray(raw.state.stack)||
  !Array.isArray(raw.state.units)||!Array.isArray(raw.state.hand)||
  !Array.isArray(raw.state.lands)||!Array.isArray(raw.state.log)||
  !raw.state.life||!raw.localUnverified)return null;
 // Browser storage can always be forged: this is resume safety, NOT proof.
 return raw;
}
export function readLocalDaily(store,entry){
 try{
  const all=JSON.parse(store.getItem(DAILY_STORAGE_KEY)||'{}');
  return safeDailyLoad(all?.[entry?.utcDate],entry);
 }catch{return null;}
}
export function writeLocalDaily(store,record){
 if(!record?.utcDate)return false;
 try{
  const all=JSON.parse(store.getItem(DAILY_STORAGE_KEY)||'{}');
  const data=all&&typeof all==='object'&&!Array.isArray(all)?all:{};
  // Keep only a small recent window of non-authoritative local results.
  data[record.utcDate]=record;
  const keys=Object.keys(data).sort();
  for(const key of keys.slice(0,Math.max(0,keys.length-120)))delete data[key];
  store.setItem(DAILY_STORAGE_KEY,JSON.stringify(data));
  return true;
 }catch{return false;}
}
export function dailyShareText(entry,result){
 if(!entry||!result)return '';
 const status=result.status==='won'?'✅ SOLVED':result.status==='lost'?'❌ UNSOLVED':'◇ IN PROGRESS';
 const actions=Number.isSafeInteger(result.acceptedActionCount)?result.acceptedActionCount:0;
 return 'Stackbreaker Daily · '+entry.utcDate+' (UTC)\n'+
  entry.difficulty+' · '+status+' · '+actions+' accepted actions\nLOCAL / UNVERIFIED · Deep Cuts Game Lab';
}
