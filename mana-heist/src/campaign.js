// Standalone, deterministic campaign progression — no DOM, no storage side effects.
// Only completed levels unlock the next stage. Historic Landfall v2 bests remain compatible.
import {CHAPTERS,LEVELS} from "./levels.js";
export function highestUnlocked(bests={}) {
  let i=0;
  while (i<LEVELS.length-1 && validBest(bests[LEVELS[i].id])) i++;
  return i;
}
export function validBest(best) {
  return !!best && Number.isInteger(best.turn) && best.turn>0 && best.turn<=6 &&
    Number.isInteger(best.spentLife) && best.spentLife>=0 && best.spentLife<=30;
}
export function unlocked(index,bests={}) {
  return Number.isInteger(index) && index>=0 && index<LEVELS.length && index<=highestUnlocked(bests);
}
export function chapterIndex(index) {
  return CHAPTERS.findIndex(ch=>index>=ch.range[0] && index<=ch.range[1]);
}
export function stageCode(index) {
  const ch=chapterIndex(index);
  if(ch<0)throw Error("Unknown stage");
  return (ch+1)+":"+(index-CHAPTERS[ch].range[0]+1);
}
export function chapterAccessible(chapter,bests={}) {
  return CHAPTERS[chapter]?.range[0]<=highestUnlocked(bests);
}
export function normalizedBests(raw) {
  if(!raw || typeof raw!=="object" || Array.isArray(raw))return {};
  return Object.fromEntries(LEVELS.filter(l=>validBest(raw[l.id])).map(l=>[l.id,{turn:raw[l.id].turn,spentLife:raw[l.id].spentLife}]));
}
