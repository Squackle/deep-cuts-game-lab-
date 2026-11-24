// Optional unscored calibration boards. Campaign boards and save IDs stay intact.
import {VERSION} from "./engine.js";
const cards=list=>list.map(([id,card])=>({id,card}));
const clues=[
 "Which source can produce only blue, and which is your only red source?",
 "Identify the source needed for the later red ward before opening the blue ward.",
 "Reserve the mana used to activate Cascade Bluffs separately from its output.",
 "A painful colored tap spends life that will not return at the next turn.",
 "Count both turns, then track the life payment, filter fuel and true colorless requirement.",
 "Try the opposite color ordering after a win; both generic wards accept either color.",
 "Find a safe order for auto-cast, then compare both legal manual payments after charging both sources."
];
function puzzle(n,title,focus,why,turnLimit,life,field,hand,stages){
 return {id:`mh-decision-${n}`,version:VERSION,chapter:"DECISION LAB · SAMPLE PROGRESSION",
  rank:n,title,briefing:focus,decision:{focus,why,clue:clues[n-1]},turnLimit,life,
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
  [["The Fourfold Azure",{U:4,R:1}],["The Reversed Filter",{U:1,R:2}],["The Final Ledger",{B:2,C:1,R:1}]]),
 puzzle(6,"Any Key Will Do","Two sources, two generic wards. Either mana can pay the first ward.",
  "Generic mana accepts either color. Spending blue or red first leaves the other legal for the second ward. No future color reservation is needed.",1,20,
  [["blue","island"],["red","mountain"]],[],[["First generic seal",{N:1}],["Second generic seal",{N:1}]]),
 puzzle(7,"Reserve the Blue Key","Same sources and same number of wards. The final ward requires a particular color.",
  "Pay the generic ward with red, then use blue for the final ward. Tapping both is safe only if you choose the correct manual payment; tapping blue first with automatic casting can force a losing payment. This is a puzzle abstraction, not an additional Magic cost rule.",1,20,
  [["blue","island"],["red","mountain"]],[],[["First generic seal",{N:1}],["Final blue seal",{U:1}]])
]);
