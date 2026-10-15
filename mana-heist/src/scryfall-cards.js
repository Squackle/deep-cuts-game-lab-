// Scryfall client-side image hydration, following Stackbreaker's batched collection flow.
// All game logic remains in the local puzzle reducer; Scryfall supplies presentation only.
// Full card scans (small/normal) are never art_cropped or modified.
import {CARDS} from "./engine.js";
import {referenceFor} from "./card-references.js";

export const CACHE_KEY="dc-mana-heist-scryfall-images-v1";
export const CACHE_TTL_MS=24*60*60*1000;
const catalog=new Map();
const cdn=/^https:\/\/(?:cards\.scryfall\.io|img\.scryfall\.com)\//;

export function imageFromCard(card){
 const face=card?.card_faces?.[0]||card||{};
 const images=card?.image_uris||face.image_uris||{};
 return {
  small:cdn.test(images.small||"")?images.small:"",
  normal:cdn.test(images.normal||"")?images.normal:"",
  artist:card?.artist||face.artist||"",
  oracle:card?.oracle_text||face.oracle_text||""
 };
}
export function cardImageUrl(key){
 const real=referenceFor(key);
 if(!real)return "";
 const img=catalog.get(real.name)?.small;
 // Named image redirect is an uncropped real Magic card while the CDN catalog loads.
 return img||"https://api.scryfall.com/cards/named?exact="+encodeURIComponent(real.name)+"&format=image&version=small";
}
export function cardNormalUrl(key){
 const real=referenceFor(key);
 if(!real)return "";
 return catalog.get(real.name)?.normal||real.image;
}
export function knownCardKeys(){return Object.keys(CARDS).filter(key=>referenceFor(key));}
export function knownCardNames(){return [...new Set(knownCardKeys().map(k=>referenceFor(k).name))];}
export function artistFor(key){const real=referenceFor(key);return real?catalog.get(real.name)?.artist||"":"";}
function addCollection(cards){
 let updated=0;
 for(const card of cards||[]){
  if(!card?.name||!knownCardNames().includes(card.name))continue;
  const info=imageFromCard(card);
  if(!info.small&&!info.normal)continue;
  catalog.set(card.name,info);updated++;
 }
 return updated;
}
let inflight=null;
export function primeCardImages(onLoaded=()=>{}){
 if(inflight)return inflight;
 inflight=(async()=>{
  const names=knownCardNames();
  try{
   const saved=JSON.parse(localStorage.getItem(CACHE_KEY)||"null");
   if(saved?.at>Date.now()-CACHE_TTL_MS&&saved?.cards){
    for(const [name,rec] of Object.entries(saved.cards)){
     if(names.includes(name)&&cdn.test(rec?.small||""))catalog.set(name,rec);
    }
    if(names.every(name=>catalog.has(name))){onLoaded();return {source:"cache",count:catalog.size};}
   }
  }catch{}
  try{
   const response=await fetch("https://api.scryfall.com/cards/collection",{
    method:"POST",headers:{"Accept":"application/json","Content-Type":"application/json"},
    body:JSON.stringify({identifiers:names.map(name=>({name}))})
   });
   if(!response.ok)throw Error("Scryfall unavailable ("+response.status+")");
   const parsed=await response.json();
   addCollection(parsed?.data);
   try{localStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),cards:Object.fromEntries(catalog)}));}catch{}
   onLoaded();
   return {source:"scryfall",count:catalog.size};
  }catch{
   // Do not retry or hammer the API. Existing named-image redirects remain the fallback.
   onLoaded();
   return {source:"fallback",count:catalog.size};
  }
 })();
 return inflight;
}
export function refreshVisibleCards(){
 if(typeof document==="undefined")return;
 for(const img of document.querySelectorAll(".mtg-card-image[data-card-key]")){
  const url=cardImageUrl(img.dataset.cardKey);
  if(url&&img.getAttribute("src")!==url)img.src=url;
 }
}
