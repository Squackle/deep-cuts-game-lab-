#!/usr/bin/env node
/**
 * Complete discovery snapshot, NOT an automatic rules engine.
 * Run manually: node mana-heist/tools/build-mana-catalog.mjs [output.json]
 * This consumes the full Scryfall Oracle Cards bulk export (one per oracle
 * identity), never the rate-limited card-by-card Scryfall API.
 *
 * Inclusion:
 *  - all instant/sorcery cards with a mana-generation/mana-untap pattern,
 *  - all artifacts with mana-generating, fixing, scaling, untap/doubling or
 *    Treasure-producing Oracle text.
 * "candidate" deliberately marks cards requiring HUMAN Oracle review.
 * The exporter cannot know X costs, replacement effects, phase timing,
 * modal DFC faces, card restrictions, or whether text refers to opponents.
 *
 * Output is data for an offline audit, not automatically playable cards.
 */
import {writeFile} from "node:fs/promises";
const ENDPOINT="https://api.scryfall.com/bulk-data/oracle_cards";
const dest=process.argv[2]||new URL("../data/mana-oracle-candidates.json",import.meta.url);
const response=await fetch(ENDPOINT,{headers:{"User-Agent":"DeepCutsEDH-ManaHeist-Research/1.0 (offline catalog build)","Accept":"application/json"}});
if(!response.ok)throw new Error("Scryfall bulk metadata "+response.status);
const metadata=await response.json();
if(metadata.type!=="oracle_cards"||!/^https:\/\/data\.scryfall\.io\//.test(metadata.download_uri||""))throw new Error("Unexpected bulk export metadata");
const cardsResponse=await fetch(metadata.download_uri,{headers:{"User-Agent":"DeepCutsEDH-ManaHeist-Research/1.0"}});
if(!cardsResponse.ok)throw new Error("Scryfall oracle data "+cardsResponse.status);
const source=await cardsResponse.json();
if(!Array.isArray(source))throw new Error("Expected Oracle card collection");
const reg={
 add:/\badd (?:\{[WUBRGCX0-9/{} ]+\}|(?:one|two|three|four|five|six|X|an amount of) mana|mana equal to)/i,
 treasure:/\bcreate\b.{0,130}\bTreasure\b/i,
 untap:/\buntap\b.{0,140}\b(?:land|artifact|permanent|mana|source)\b/i,
 modify:/\b(?:double (?:the amount|your mana)|additional mana|mana of any (?:type|color)|mana as though it were|whenever .*? taps? .*? for mana|mana abilities|mana pool)\b/i,
 cost:/\b(?:costs? \{[0-9]+\} less|mana cost|spend mana)\b/i
};
function lines(card){
 const faces=card.card_faces?.length?card.card_faces:[card];
 return faces.map(f=>({type:f.type_line||card.type_line||"",text:f.oracle_text||""}));
}
function classify(card){
 if(["token","art_series","emblem","vanguard","scheme","plane","phenomenon"].includes(card.layout))return null;
 const faces=lines(card);
 const relevant=faces.filter(f=>/\b(?:Artifact|Instant|Sorcery)\b/i.test(f.type));
 if(!relevant.length)return null;
 const tags=new Set();
 for(const face of relevant){
  for(const [tag,rx] of Object.entries(reg))if(rx.test(face.text))tags.add(tag);
 }
 if(!tags.size)return null;
 const types=[...new Set(relevant.flatMap(f=>["Artifact","Instant","Sorcery"].filter(t=>new RegExp("\\b"+t+"\\b","i").test(f.type))))];
 // No accidental "exhaustive playable" claim: all entries require review.
 return {oracle_id:card.oracle_id,name:card.name,types,
  mana_cost:card.mana_cost||null,oracle_text:card.oracle_text||null,
  faces:card.card_faces?.length?card.card_faces.map(f=>({name:f.name,type_line:f.type_line,oracle_text:f.oracle_text,mana_cost:f.mana_cost})):undefined,
  commander_legality:card.legalities?.commander||"unknown",
  color_identity:card.color_identity||[],tags:[...tags].sort(),
  scryfall_uri:card.scryfall_uri||null,review:"candidate-unverified"};
}
const candidates=source.map(classify).filter(Boolean);
candidates.sort((a,b)=>a.name.localeCompare(b.name));
const tally=Object.fromEntries(["Artifact","Instant","Sorcery"].map(t=>[t,candidates.filter(c=>c.types.includes(t)).length]));
const snapshot={source:{provider:"Scryfall",bulk_type:"oracle_cards",updated_at:metadata.updated_at,
 downloaded_file:metadata.download_uri,oracle_cards_checked:source.length,compiled_at:new Date().toISOString()},
 scope:"All potentially mana-relevant artifact, instant and sorcery Oracle identities matching public discovery filters; not full rules implementation",
 caveat:"Candidates include false positives and exclude atypical mana interactions. Every playable card requires explicit Oracle verification and mechanics tests.",
 count:candidates.length,counts_by_type:tally,cards:candidates};
await writeFile(dest,JSON.stringify(snapshot,null,2));
console.log(JSON.stringify({count:snapshot.count,types:tally,output:String(dest),sourceUpdated:metadata.updated_at}));
