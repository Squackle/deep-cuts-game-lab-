// Display-only, full-print Scryfall images loaded by the browser's ordinary
// <img> element. The existing deterministic reducer supplies all game mechanics.
// This does not mirror/proxy/copy Scryfall imagery or make gameplay depend on an API.
import {CARDS} from "./engine.js";
import {referenceFor} from "./card-references.js";

export function knownCardKeys(){return Object.keys(CARDS).filter(key=>referenceFor(key));}
export function knownCardNames(){return [...new Set(knownCardKeys().map(key=>referenceFor(key).name))];}
export function cardImageUrl(key){
 const card=referenceFor(key);
 if(!card)return "";
 // Scryfall's named-image endpoint redirects to the complete unaltered card face.
 // Only cards currently visible in hand/battlefield are requested, not all 24.
 return "https://api.scryfall.com/cards/named?exact="+encodeURIComponent(card.name)+"&format=image&version=small";
}
export function cardNormalUrl(key){
 return referenceFor(key)?.image||"";
}
