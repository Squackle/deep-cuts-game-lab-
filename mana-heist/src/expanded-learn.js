// Isolated, unstarred Learn Mana expansion; campaign IDs and guest medals
// remain exactly as they were. Scenarios intentionally start with a snapshot
// board already assembled, so we do not invent summoning/ETB histories.
import {VERSION} from "./engine.js";
import {LEVELS} from "./levels.js";
const obj=(id,card)=>({id,card});
const ex=(num,title,briefing,field,hand,cost,opts={})=>({
 id:"mh-learn-"+String(num).padStart(2,"0"),version:VERSION,
 chapter:"THE SAGE'S WORKSHOP",rank:Math.min(5,Math.max(2,Math.floor(num/6))),
 title,briefing,turnLimit:1,life:20,
 field:field.map((card,i)=>obj("f"+i,card)),
 hand:hand.map((card,i)=>obj("h"+i,card)),
 library:[],
 stages:[{name:opts.spell||"Charge the Ward",cost,...(opts.spellType?{spellType:opts.spellType}:{})}],
 ...opts
});
export const EXTRA_LESSONS=Object.freeze([
 ex(19,"Artifacts Make Mana","Tap Sol Ring for two true colorless mana. Lands are not the only reusable mana sources.",["solring","island"],[],{C:2,U:1}),
 ex(20,"Paying a Signet","Use a colorless mana from Wastes to pay Azorius Signet's {1} activation. The Signet then produces white and blue together.",["relic","island","signet"],[],{W:1,U:2}),
 ex(21,"Casting Dark Ritual","Tap a Swamp for {B}. Cast Dark Ritual from your hand, paying {B} to add {B}{B}{B}. Then cast the ward.",["swamp"],["ritual"],{B:3}),
 ex(22,"The Filter Forge","Signet, Sol Ring and Cascade Bluffs form a mana pipeline. Pay conversion costs before you receive their outputs.",["relic","island","mountain","solring","signet","bluffs"],[],{W:1,U:3,R:1,C:1,N:1}),
 ex(23,"Red Ritual","Pay {1}{R} to cast Pyretic Ritual from your hand and gain {R}{R}{R}. Instants go to the graveyard when they resolve.",["relic","mountain"],["pyretic"],{R:3}),
 ex(24,"Creature-Only Mana","Ancient Ziggurat can make mana for creature spells but not for other spells or activation costs.",["ziggurat","island","forest"],[],{G:1,U:1},{spellType:"creature",spell:"Summon the Guardian"}),
 ex(25,"Urborg and Coffers","Urborg makes each land a Swamp. Cabal Coffers pays two generic mana, then adds black mana for every Swamp.",["swamp","swamp","coffers","urborg","solring"],[],{B:5}),
 ex(26,"Lotus Field","Lotus Field makes three mana of one chosen color on a tap. This board begins with it already on the battlefield.",["lotus","island"],[],{U:4}),
 ex(27,"Borrowed Colors","Fellwar Stone can tap for a color an opponent's land could produce. The opponent's lands in this snapshot make white and black, but not blue or colorless; combine Fellwar Stone with your Island.",["fellwar","island","relic"],[],{W:1,U:1},{opponentLandColors:["W","B"]}),
 ex(28,"The Talisman's Toll","Talisman of Dominance adds colorless safely, or blue/black while dealing 1 damage to you. At 2 life, make black with the Talisman and combine it with Island and Wastes for the seal.",["talisman","island","relic"],[],{B:1,U:1,C:1},{life:2})
]);
export const LEARN_LEVELS=Object.freeze([...LEVELS.slice(0,18),...EXTRA_LESSONS]);
if(LEARN_LEVELS.length!==28)throw Error("Learn Mana lesson catalog mismatch");
