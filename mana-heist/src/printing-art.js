// Standalone Game Lab: randomized authentic Scryfall card faces with NO fetch.
// Scryfall's /cards/random accepts the same image redirect parameters as
// /cards/named, and its q parameter limits results to the exact English land.
// The real <img> node is preserved across taps/plays/Undo so one printing
// remains on a given physical card until the puzzle is restarted.
import {referenceFor} from "./card-references.js";
import {cardNormalUrl} from "./scryfall-cards.js";

let stageSerial=0;
let selected=new Map();
export function randomPrintingUrl(name,token){
 if(!name)return "";
 const q='!"'+name+'" lang:en';
 // Distinct source URLs avoid accidentally reusing a browser-cached random
 // redirect across puzzle loads or between duplicate land instances.
 return "https://api.scryfall.com/cards/random?q="+encodeURIComponent(q)+
   "&format=image&version=normal&_="+encodeURIComponent(String(token));
}
export function startStagePrintings(level){
 stageSerial++;
 selected=new Map();
 const cards=[...level.field,...level.hand,...level.library];
 for(const instance of cards){
  const card=referenceFor(instance.card);
  if(!card)continue;
  const salt=String(Date.now())+"-"+stageSerial+"-"+instance.id+"-"+Math.random().toString(36).slice(2,9);
  selected.set(instance.id,randomPrintingUrl(card.name,salt));
 }
 return stageSerial;
}
export function printingFor(id){
 const url=selected.get(id);
 return url?{small:url,normal:url}:null;
}
export function imageFor(instanceId,cardKey){
 return selected.get(instanceId)||cardNormalUrl(cardKey);
}
export function invalidateStagePrintings(){stageSerial++;selected=new Map();}
