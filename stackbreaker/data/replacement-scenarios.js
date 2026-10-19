// Twenty-four curated, version-pinned local practice WINDOWS: six interaction
// archetypes, four independent board states each. All must pass right/wrong replay.
import {PREVENTION_RULES_VERSION} from '../src/replacement-prevention.js';
const sets=[
 {name:'The First Shield',category:'survive',kind:'life',n:2,life:1,wrong:'double'},
 {name:'Do Not Amplify',category:'survive',kind:'life',n:3,life:2,wrong:'double'},
 {name:'Creature Under Fire',category:'keepCreature',kind:'creature',n:2,tough:1,wrong:'double'},
 {name:'The Toughness Line',category:'keepCreature',kind:'creature',n:3,tough:2,wrong:'double'},
 {name:'Double Furnace',category:'survive',kind:'twoDoubles',n:2,life:1,wrong:'double'},
 {name:'Amplification Trap',category:'survive',kind:'twoDoubles',n:3,life:2,wrong:'double'},
 {name:'Two Prevention Shields',category:'survive',kind:'twoSalves',n:5,life:2,wrong:'double'},
 {name:'Six Damage Event',category:'survive',kind:'twoSalves',n:6,life:3,wrong:'double'},
 {name:'Pariah Shield Window',category:'keepCreature',kind:'redirect',n:2,tough:1,wrong:'redirect'},
 {name:'Keep the Enchanted Creature',category:'keepCreature',kind:'redirect',n:3,tough:2,wrong:'redirect'},
 {name:'Pariah and Furnace',category:'keepCreature',kind:'redirectDouble',n:2,tough:1,wrong:'redirect'},
 {name:'Redirect Before Doubling',category:'keepCreature',kind:'redirectDouble',n:3,tough:2,wrong:'redirect'}
];
const effect=(id,card,kind,more={})=>({id,card,kind,...more});
const shield=target=>effect('shield','Healing Salve','prevent',{target,remaining:3});
const double=()=>effect('double','Furnace of Rath','double');
const secondDouble=()=>effect('double-two','Dictate of the Twin Gods','double');
const secondShield=target=>effect('shield-two','Healing Salve','prevent',{target,remaining:3});
const redirect=()=>effect('redirect','Pariah','redirect',{from:'player',to:'guard'});
const action=id=>({action:'choose',actor:'player',effectId:id});
export const replacementScenarios=sets.flatMap((part,k)=>
 [0,1].map((variant)=>{
  const id='rp-'+String(k*2+variant+1).padStart(3,'0');
  const creature=part.category==='keepCreature';
  const target=part.kind==='redirect'||part.kind==='redirectDouble'?'player':creature?'guard':'player';
  const permanent=creature?{id:'guard',controller:'player',zone:'battlefield',
    toughness:part.tough,damage:0,cardId:'Grizzly Bears'}:null;
  const effects=[double(),shield(target)];
  let solution=['shield'],wrong=['double','shield'];
  if(part.kind==='twoDoubles'){
   effects.push(secondDouble());wrong=['double','shield','double-two'];
  }
  if(part.kind==='twoSalves'){
   effects.push(secondShield(target));solution=['shield','shield-two'];
   wrong=['double','shield','shield-two'];
  }
  if(part.kind==='redirect'||part.kind==='redirectDouble'){
   effects.splice(0,effects.length,shield('player'),redirect());
   if(part.kind==='redirectDouble')effects.push(double());
   wrong=part.kind==='redirectDouble'?['redirect','double']:['redirect'];
  }
  return{
   id,title:part.name+(variant?' · Variant B':' · Variant A'),
   version:PREVENTION_RULES_VERSION,life:{player:part.life||10,opponent:10},
   permanents:permanent?[permanent]:[],
   damage:{source:'opposing-bolt',controller:'opponent',target,amount:part.n},
   effects,objective:creature?{type:'keepCreature',target:'guard'}:{type:'survive'},
   scenarioFamily:part.kind,variant,
   explanation:'The affected player or affected permanent controller orders simultaneous prevention and replacement effects. Each effect modifies this one damage event at most once.',
   solution:solution.map(action),wrongLine:wrong.map(action)
  };
 })));
export default replacementScenarios;
