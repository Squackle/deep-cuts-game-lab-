// Genuine Magic art-variant rotation for the standalone Game Lab.
// One English, full-card Scryfall printing is selected PER LAND INSTANCE each
// time a stage opens. Choices stay fixed through tapping, casting and Undo.
// Only image URLs are cached; no images or API responses are bundled into code.
// Scryfall image usage is subject to Wizards/Scryfall rights and policies.
import {referenceFor} from "./card-references.js";
import {cardImageUrl} from "./scryfall-cards.js";

const STORE_KEY="dc-mana-heist-print-variants-v1";
const CACHE_TTL=24*60*60*1000;
const validImage=url=>typeof url==="string"&&/^https:\/\/(?:cards\.scryfall\.io|img\.scryfall\.com)\//.test(url);
export function artSearchUrl(name){
 return "https://api.scryfall.com/cards/search?q="+encodeURIComponent('!"'+name+'" lang:en')+"&unique=art&order=released";
}
export function uniquePrints(data,name){
 const seen=new Set();
 return (Array.isArray(data)?data:[]).filter(card=>card?.name===name).map(card=>{
  const face=card.image_uris||card.card_faces?.[0]?.image_uris||{};
  return {small:face.small,normal:face.normal,artist:card.artist||""};
 }).filter(rec=>{
  if(!validImage(rec.small)||!validImage(rec.normal)||seen.has(rec.small))return false;
  seen.add(rec.small);return true;
 }).slice(0,175);
}
export function selectPrinting(printings,random=Math.random){
 if(!printings?.length)return null;
 const r=Math.max(0,Math.min(.999999,Number(random())||0));
 return printings[Math.floor(r*printings.length)];
}
function readCache(){
 try{
  const saved=JSON.parse(localStorage.getItem(STORE_KEY)||"null");
  if(saved?.until>Date.now()&&saved?.entries&&typeof saved.entries==="object")return saved.entries;
 }catch{}
 return {};
}
const localCache=readCache();
const promises=new Map();
let queue=Promise.resolve();
let lastRequest=0;
function fetchArt(name){
 if(Array.isArray(localCache[name])&&localCache[name].length)return Promise.resolve(localCache[name]);
 if(promises.has(name))return promises.get(name);
 const job=queue.then(async()=>{
  const wait=Math.max(0,150-(Date.now()-lastRequest));
  if(wait)await new Promise(done=>setTimeout(done,wait));
  lastRequest=Date.now();
  const response=await fetch(artSearchUrl(name),{headers:{Accept:"application/json"}});
  if(!response.ok)throw Error("Scryfall art lookup failed: "+response.status);
  const result=await response.json();
  const printings=uniquePrints(result.data,name);
  if(printings.length){
   localCache[name]=printings;
   try{localStorage.setItem(STORE_KEY,JSON.stringify({until:Date.now()+CACHE_TTL,entries:localCache}));}catch{}
  }
  return printings;
 }).catch(()=>[]);
 queue=job.then(()=>{},()=>{});
 promises.set(name,job);
 return job;
}
let currentToken=0;
let assigned=new Map();
export function printingFor(instanceId,cardKey){
 return assigned.get(instanceId)||null;
}
export function imageFor(instanceId,cardKey){
 return printingFor(instanceId,cardKey)?.small||cardImageUrl(cardKey);
}
export function startStagePrintings(level,onUpdate=()=>{}){
 const token=++currentToken;
 assigned=new Map();
 const entries=[...level.field,...level.hand,...level.library];
 const group=new Map();
 for(const entry of entries){
  const ref=referenceFor(entry.card);
  if(!ref)continue;
  const arr=group.get(ref.name)||[];
  arr.push(entry.id);
  group.set(ref.name,arr);
 }
 for(const [name,ids] of group){
  if(localCache[name]?.length){
   for(const id of ids)assigned.set(id,selectPrinting(localCache[name]));
   continue;
  }
  fetchArt(name).then(printings=>{
   if(token!==currentToken||!printings.length)return;
   for(const id of ids)assigned.set(id,selectPrinting(printings));
   onUpdate(ids);
  });
 }
 return token;
}
export function invalidateStagePrintings(){currentToken++;assigned=new Map();}
