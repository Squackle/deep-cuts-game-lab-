// Optional unscored calibration boards. Campaign boards and save IDs stay intact.
import {VERSION} from "./engine.js";
const cards=list=>list.map(([id,card])=>({id,card}));
function puzzle(n,title,focus,why,turnLimit,life,field,hand,stages){
 return {id:`mh-decision-${n}`,version:VERSION,chapter:"DECISION LAB · SAMPLE PROGRESSION",
  rank:n,title,briefing:focus,decision:{focus,why},turnLimit,life,
  field:cards(field),hand:cards(hand),library:[],stages:stages.map(([name,cost])=>({name,cost}))};
}
export const DECISION_LADDER=Object.freeze([
 puzzle(1,"Two Colors, Two Sources","Match two exact colors using one flexible source and one fixed source.",
  "The Island supplies blue, leaving the dual land free to supply red. Two blue mana cannot replace a red requirement.",1,20,
  [["fixed","island"],["dual","dualUR"]],[],[["The Split Seal",{U:1,R:1}]]),
 puzzle(2,"Keep the Red Key","The blue seal is only the first obligation. Read both wards before committing the flexible source.",
  "Blue from the Island opens the first ward. Reserving the dual land for red keeps the second ward possible; using its blue mode can open ward one and still lose the vault.",1,20,
  [["fixed","island"],["dual","dualUR"]],[],[["The Blue Seal",{U:1}],["The Red Key",{R:1}]]),
 puzzle(3,"A Filter Needs Fuel","An activation cost competes with the ward costs. Plan both the filter input and its output.",
  "One Island pays the blue seal; the other funds Cascade Bluffs. Two red from the filter plus the Mountain supply the three red still needed. Choosing blue output can open the first ward but cannot finish.",1,20,
  [["blue1","island"],["blue2","island"],["red","mountain"],["filter","bluffs"]],[],
  [["The Blue Latch",{U:1}],["The Triple Ember",{R:3}]]),
 puzzle(4,"Tomorrow's Life","Two turns, two life. Compare entry timing and life costs against the entire sequence, not only the opening ward.",
  "Drowned Catacomb supplies blue on turn one. Play Underground River on turn two; both must supply black for the final ward. The only life payment belongs to black: using River for blue first leaves too little life to use its black mode later.",2,2,
  [["blue","island"],["red","mountain"]],[["check","checkUB"],["pain","painUB"],["shock","shockUR"]],
  [["The Azure Gate",{U:2,R:1}],["Tomorrow's Toll",{U:1,B:2,R:1}]]),
 puzzle(5,"The Interlocking Vault","Three wards, two turns. Coordinate land order, a changing filter role and a shared life budget. Open Ward Plan to inspect every cost before committing.",
  "The check land must precede the pain land. Cascade Bluffs supplies two blue on turn one and two red on turn two. Reserve both black sources and Wastes for the final ward; the single life payment belongs to black, not blue.",2,2,
  [["blue1","island"],["blue2","island"],["red","mountain"],["filter","bluffs"],["wastes","relic"]],
  [["check","checkUB"],["pain","painUB"],["shock","shockUR"]],
  [["The Fourfold Azure",{U:4,R:1}],["The Reversed Filter",{U:1,R:2}],["The Final Ledger",{B:2,C:1,R:1}]])
]);
