// Five opt-in, unranked decision workshops selected from tested authored cases.
// This does not edit any of the original 250 Classic IDs or Daily ranked manifest.
// Reuses the same real stack engine; reference length is NOT a proven minimum.
import original from '../data/scenarios.json' with {type:'json'};
import expansion from '../data/campaign-expansion.json' with {type:'json'};
import {commanderScenario} from './commander.js';
import {createGame,tapLand,activate,autoplay,legalActions,legalTargets} from './engine.js';

export const STRATEGY_TRIALS_VERSION='sb-unranked-decision-trials-1';
const SOURCE=[...original,...expansion];
const DESIGNS=Object.freeze([
 {source:'sb-07',title:'Do Less, Win More',focus:'Avoid unnecessary responses',
  question:'Does the stack really need both answers, or can one well-timed protection solve the actual objective?',
  lesson:'A reference line is only one legal answer. Test whether one response already accomplishes the goal.'},
 {source:'sb-16',title:'Two Lives, Two Targets',focus:'Allocate protection to different threats',
  question:'Two creatures face separate damage. Which protection belongs on which permanent?',
  lesson:'Read the incoming spell targets, then allocate the response effects. More casts alone do not guarantee success.'},
 {source:'sb-18',title:'The Counterspell Trap',focus:'Read counterspell restrictions',
  question:'One response can stop any spell; another cannot target the threatening sorcery.',
  lesson:'Legal target restrictions and stack order matter more than the number of cards in hand.'},
 {source:'sb-23',title:'Counter or Gain Life?',focus:'Balance two incoming threats',
  question:'When multiple spells threaten your life, determine what must resolve and what must be stopped.',
  lesson:'Preventing one hit might not be enough. Evaluate your final life total after the full stack resolves.'},
 {source:'sb-28',title:'Win and Keep the Giant',focus:'Coordinate victory and preservation',
  question:'Lethal damage to the opponent is not enough if your named creature does not survive.',
  lesson:'Track all objective conditions across priority windows; a fast win without the creature is still a loss.'}
]);
export const STRATEGY_TRIALS=Object.freeze(DESIGNS.map((design,i)=>{
 const ix=SOURCE.findIndex(p=>p.id===design.source);
 if(ix<0)throw Error('Missing original authored Stackbreaker case '+design.source);
 const source=commanderScenario(SOURCE[ix],ix);
 return {...source,id:'st-'+String(i+1).padStart(2,'0'),
  title:design.title,intro:design.question,
  strategyFocus:design.focus,strategyLesson:design.lesson,sourceId:design.source,
  unranked:true,trialVersion:STRATEGY_TRIALS_VERSION};
}));

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
