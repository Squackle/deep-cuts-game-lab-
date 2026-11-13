/** Deterministic encounter card zones. Persistent learned spells remain in run.spellbook.
 * The encounter draws actual instances; resolved instants/sorceries move to its graveyard.
 * The library and hand are serializable and never read wall-clock or browser randomness. */
import { makeRng, shuffle } from '../core/rng.js';
export function createCombatDeck(entries, seed, handCapacity = 7) {
 const deck={library:shuffle(makeRng((seed ^ 0x5af37e1)>>>0),entries.map(x=>({...x}))), hand:[],graveyard:[],exile:[],capacity:handCapacity};
 drawCards(deck,3);return deck;
}
export function drawCards(deck,n=1){
 const drawn=[];
 for(let i=0;i<n&&deck.library.length;i++){const card=deck.library.shift();deck.hand.push(card);drawn.push(card);}
 return drawn;
}
export function playFromHand(deck,id,{permanent=false}={}){
 const i=deck.hand.findIndex(c=>c.id===id);
 if(i<0)throw new Error('Card is not in hand');
 const [card]=deck.hand.splice(i,1);
 if(!permanent)deck.graveyard.push(card);
 return card;
}
export function returnToHand(deck,id){
 const i=deck.graveyard.findIndex(c=>c.id===id);if(i<0)return false;
 deck.hand.push(deck.graveyard.splice(i,1)[0]);return true;
}
export function discardFromHand(deck,id){return playFromHand(deck,id);}
export function endHandLimit(deck){return Math.max(0,deck.hand.length-deck.capacity);}
