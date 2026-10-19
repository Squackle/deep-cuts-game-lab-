// A voluntary *human* device-QA checklist. No automated hardware claims,
// identifiers, free text, timestamps, device fingerprinting or network access.
// Kept separate from player scores and difficulty counters.
export const DEVICE_QA_KEY="dc-mana-heist-device-qa-v1";
export const DEVICE_QA_VERSION=1;
export const DEVICE_QA_CHECKS=Object.freeze([
 {id:"basic-tap",title:"Basic tap and Cast Spell",steps:"Learn Mana → Lesson 1. Tap Island, confirm blue mana enters the cauldron, then Cast Spell. Confirm the lesson can finish."},
 {id:"tap-choice",title:"Mana-choice overlay",steps:"Learn Mana → Lesson 27 (Fellwar Stone). Tap Fellwar Stone, select a mana color, and repeat after Restart. Check choices fit on screen, can scroll, and Cancel works."},
 {id:"life-choice",title:"Life payment feedback",steps:"Learn Mana → Lesson 28 (Talisman). Activate its black mode; check life changes from 2 to 1 and the remaining costs can be paid."},
 {id:"advanced-rack",title:"Advanced battlefield scrolling",steps:"Mana Heist → Galaxy X → stage 451. Swipe the source rack sideways, and confirm all sources can be reached and activated without unintentionally moving the whole page."},
 {id:"portrait",title:"Portrait layout",steps:"On a real phone in portrait, open any stage. Check Cauldron, Cast, Undo, End Turn, mana choices and return controls are visible and clickable with no clipped text."},
 {id:"landscape",title:"Landscape/short-screen layout",steps:"Rotate the real phone or use a short viewport. Open a mana-choice dialog; confirm every action can be scrolled to and nothing is hidden behind the system safe area."},
 {id:"card-inspector",title:"Card inspection and return",steps:"Choose a puzzle with cards in hand. Select a card, open View Card, close it, then play the card using the on-screen button rather than dragging."},
 {id:"save-restore",title:"Local progress survives reload",steps:"Complete a lesson or stage, return to the map, reload this browser and verify the saved result still appears. Undo and Restart should remain responsive."},
 {id:"keyboard",title:"Keyboard and screen reader labels",steps:"With a physical keyboard, Tab to interactive cards and an open mana-choice dialog. Check visible focus, trapped Tab within the dialog, Escape cancellation and restored focus."}
]);
export const DEVICE_QA_STATUSES=Object.freeze(["untested","pass","issue","not-applicable"]);
const contexts={device:["unspecified","phone","tablet","desktop"],browser:["unspecified","safari","chrome","firefox","edge","other"],orientation:["unspecified","portrait","landscape"]};
export const blankDeviceQA=()=>({v:DEVICE_QA_VERSION,device:"unspecified",browser:"unspecified",orientation:"unspecified",checks:Object.fromEntries(DEVICE_QA_CHECKS.map(c=>[c.id,"untested"]))});
export function normalizeDeviceQA(raw){
 const d=blankDeviceQA();
 if(!raw||raw.v!==DEVICE_QA_VERSION||typeof raw!=="object"||Array.isArray(raw))return d;
 for(const field of Object.keys(contexts))if(contexts[field].includes(raw[field]))d[field]=raw[field];
 if(raw.checks&&typeof raw.checks==="object"&&!Array.isArray(raw.checks))
  for(const item of DEVICE_QA_CHECKS)if(DEVICE_QA_STATUSES.includes(raw.checks[item.id]))d.checks[item.id]=raw.checks[item.id];
 return d;
}
export function setDeviceContext(raw,field,value){
 const d=normalizeDeviceQA(raw);
 if(Object.hasOwn(contexts,field)&&contexts[field].includes(value))d[field]=value;
 return d;
}
export function setDeviceQAResult(raw,id,status){
 const d=normalizeDeviceQA(raw);
 if(DEVICE_QA_CHECKS.some(x=>x.id===id)&&DEVICE_QA_STATUSES.includes(status))d.checks[id]=status;
 return d;
}
export function summarizeDeviceQA(raw){
 const d=normalizeDeviceQA(raw),counts={pass:0,issue:0,"not-applicable":0,untested:0};
 for(const status of Object.values(d.checks))counts[status]++;
 return {...counts,total:DEVICE_QA_CHECKS.length,reviewed:counts.pass+counts.issue+counts["not-applicable"],
  state:counts.issue>0?"issues-reported":counts.untested>0?"incomplete":"reviewed-by-tester"};
}
export function exportDeviceQA(raw){
 const d=normalizeDeviceQA(raw),summary=summarizeDeviceQA(d);
 return JSON.stringify({
  format:"Mana Heist Game Lab — voluntarily completed manual device QA",
  version:DEVICE_QA_VERSION,
  notice:"Self-reported results only. Not an automated device certification or measured player-difficulty calibration. No timestamps, identifiers, freeform notes or device fingerprints.",
  environment:{device:d.device,browser:d.browser,orientation:d.orientation},
  summary,
  checks:DEVICE_QA_CHECKS.map(c=>({id:c.id,label:c.title,result:d.checks[c.id]}))
 },null,2);
}
