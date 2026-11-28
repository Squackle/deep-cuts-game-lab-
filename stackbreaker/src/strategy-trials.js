// Five adapted workshops and two new controlled comparison boards.
// This does not edit any of the original 250 Classic IDs or Daily ranked manifest.
// Reuses the same real stack engine; reference length is NOT a proven minimum.
import original from '../data/scenarios.json' with {type:'json'};
import expansion from '../data/campaign-expansion.json' with {type:'json'};
import {RULES_VERSION} from './cards.js';
import {commanderScenario} from './commander.js';
import {createGame,tapLand,activate,autoplay,legalActions,legalTargets} from './engine.js';

export const STRATEGY_TRIALS_VERSION='sb-unranked-decision-trials-1';
const SOURCE=[...original,...expansion];
const DESIGNS=Object.freeze([
 {source:'sb-07',title:'Do Less, Win More',focus:'Avoid unnecessary responses',
  question:'Does the stack really need both answers, or can one well-timed protection solve the actual objective?',
  lesson:'Selfless Spirit grants your creatures indestructible before either destroy effect resolves. Sacrificing it is a cost. Countering Murder as well is unnecessary for this objective.'},
 {source:'sb-16',title:'Two Lives, Two Targets',focus:'Allocate protection to different threats',
  question:'Two creatures face separate damage. Which protection belongs on which permanent?',
  lesson:'Allocate the boosts to different creatures. Blossoming Defense also makes the opposing spell targeting its creature illegal; Titanic Growth protects the other by raising toughness above its damage.'},
 {source:'sb-18',title:'The Counterspell Trap',focus:'Read counterspell restrictions',
  question:'One response can stop any spell; another cannot target the threatening sorcery.',
  lesson:'Essence Scatter targets creature spells, not Wrath of God. Cancel can stop the sweeper; a toughness boost can survive damage but cannot prevent destruction.'},
 {source:'sb-23',title:'Counter or Gain Life?',focus:'Balance two incoming threats',
  question:'When multiple spells threaten your life, determine what must resolve and what must be stopped.',
  lesson:'Compare remaining life with the total incoming damage. Healing Salve can gain three life in this exercise; counter the other damaging spell if the total still threatens you.'},
 {source:'sb-28',title:'Win and Keep the Giant',focus:'Coordinate victory and preservation',
  question:'Lethal damage to the opponent is not enough if your named creature does not survive.',
  lesson:'Protect the giant, survive the incoming damage and counter the spell aimed at your lethal Bolt. The stack resolves top first; your victory must satisfy both objective conditions.'}
]);
const adapted=DESIGNS.map((design,i)=>{
 const ix=SOURCE.findIndex(p=>p.id===design.source);
 if(ix<0)throw Error('Missing original authored Stackbreaker case '+design.source);
 // Preserve the authored interaction, not the seeded Commander filler.
 // Ranked boards still use the original Commander adapter. Here the learner
 // sees only the authored resources and deliberately selected alternatives.
 const source={...structuredClone(SOURCE[ix]),solution:commanderScenario(SOURCE[ix],ix).solution};
 return {...source,id:'st-'+String(i+1).padStart(2,'0'),
  title:design.title,intro:design.question,
  strategyFocus:design.focus,strategyLesson:design.lesson,sourceId:design.source,
  retryPrompt:["Replay using only Selfless Spirit; leave every other response unused.","Try swapping which creature receives each protection spell. Compare the damage and legality on resolution.","Try countering Wrath first versus boosting the Bear first. Compare legal timing and remaining resources.","Try an alternate counter target and compare the final life total.","Try a different order of the three responses; all objectives must still hold."][i],unranked:true,trialVersion:STRATEGY_TRIALS_VERSION};
});
function paymentTrial(n,title,mana,lesson){
 return {id:'st-'+String(n).padStart(2,'0'),version:RULES_VERSION,title,tier:'Investigator',
  intro:'Keep the Lion alive through Murder and Languish. Which response must answer each threat?',
  hint:'Languish does not target. Counter it; use hexproof against Murder. Check what mana remains.',
  explanation:lesson,strategyFocus:'Protect against two different threats',strategyLesson:lesson,
  life:{player:20,opponent:20},mana,lands:[],units:[{id:'lion',card:'Savannah Lions',controller:'player'}],
  activeActor:'opponent',opponentPolicy:'alwaysPass',
  stack:[{id:'sweep',card:'Languish',controller:'opponent'},{id:'removal',card:'Murder',controller:'opponent',targetId:'lion'}],
  hand:[{id:'counter',card:'Negate'},{id:'shield',card:'Blossoming Defense'}],
  objective:{type:'keepUnit',unitId:'lion'},solution:[['counter','sweep'],['shield','lion']],
  sourceId:null,retryPrompt:["Try both orders of the two responses, and compare remaining green mana.","Try protecting first, then countering; alternatively spend colorless on Negate first."][n-6],unranked:true,trialVersion:STRATEGY_TRIALS_VERSION};
}
export const STRATEGY_TRIALS=Object.freeze([...adapted,
 paymentTrial(6,'Two threats, spare green',{U:1,G:2},'Negate must counter Languish. Blossoming Defense stops Murder by making its target illegal. The second green mana is available even after paying Negate.'),
 paymentTrial(7,'Two threats, no spare green',{U:1,G:1,C:1},'The same two responses suffice, but spending green on Negate first strands Blossoming Defense. Spend colorless on the generic cost, or cast the protection first. Hexproof cannot stop a non-targeting toughness reduction.')
]);

// Exercise all ordered subsets of the supplied reference line, not every
// possible legal strategy. The result is an upper bound on response count,
// never global optimality, solution uniqueness, or human-calibrated difficulty.
export function referenceSubsetEvidence(scene,{maxResponses=12}={}){
 const line=scene?.solution;
 if(!Array.isArray(line)||line.length>maxResponses||maxResponses>16)
  return {status:'inconclusive',reason:'reference-size-budget',shortestReferenceSubset:null};
 const winning=[];
 for(let mask=0;mask<2**line.length;mask++){
  const subset=line.filter((_,i)=>mask&(1<<i));
  let state;
  try{
   state=createGame(scene);
   for(const land of state.lands)if(!land.tapped)state=tapLand(state,land.id);
   for(const [id,target] of subset){
    if(!legalActions(state).includes(id))throw Error('unplayable response');
    const chosen=state.hand.find(a=>a.id===id);
    if(!legalTargets(state,chosen).includes(target))throw Error('illegal target');
    state=activate(state,id,target);
   }
   state=autoplay(state);
  }catch{continue}
  if(state.status==='won')winning.push({responses:subset.length,actions:subset});
 }
 if(!winning.length)return {status:'inconclusive',reason:'no-winning-reference-subset',
  referenceResponses:line.length,shortestReferenceSubset:null};
 winning.sort((a,b)=>a.responses-b.responses);
 return {status:'verified-subset',referenceResponses:line.length,
  shortestReferenceSubset:winning[0].responses,avoidablyLong:winning[0].responses<line.length,
  witness:winning[0].actions,winningSubsetCount:winning.length,
  scope:'Only ordered subsets of a published reference response line; not a global proof'};
}
