// Source-aligned coaching for the existing 18 authored Learn Mana scenarios.
// Instruction text must be true for each actual level, never invented for a
// different board. State-aware progress avoids repeating the first step.
const item=(title,skill,tag,opening,progress,why)=>({title,skill,tag,opening,progress,why});
export const SAGE_LESSONS=Object.freeze([
 item("Tapping for Mana","basic-land","mana","Click the Island above the cauldron to tap it. Watch blue mana flow into the pool, then cast the spell.","The Island is tapped and you have blue mana. Use CAST SPELL to spend it.","Tapping a land produces mana. The land stays on the battlefield; its mana is the resource you spend."),
 item("Playing Your First Land","land-drop","lands","Tap the Mountain in your hand at the bottom of the screen to play it. Then tap it on the battlefield for red mana.","Now tap your Mountain for red mana and cast Ignite the Door.","Playing a land uses your land drop for the turn. It is not the same as casting a spell."),
 item("One Land Each Turn","turns","lands","Play an Island or Mountain from your hand. You may play just one land each turn.","Cast the current ward if you have the right color. END TURN resets the land drop and untaps your lands.","Unused mana disappears at the turn boundary in this simplified campaign. Real Magic clears it after every step or phase."),
 item("Choosing a Dual Land","dual-land","colors","Play the dual land, then choose which color it produces when you tap it.","A normal dual land adds only one chosen color on a tap. Watch the next spell before choosing.","Volcanic Island can produce blue or red, not both on the same tap."),
 item("Mixing Mana","multicolor-cost","colors","Cast the first blue spell using your Island or dual land. The next spell needs blue AND red in the pool at the same time.","For the Split Lock, tap one source for blue and another for red. Watch their colors blend visually in the cauldron, then cast.","Colors swirl together in the liquid, but remain separate mana units. A spell with {U}{R} still needs one blue and one red."),
 item("Shock Lands and Life","shock-land","life","Play Steam Vents. Choose to pay 2 life so it enters untapped; your spell must resolve this turn.","Tap the untapped Steam Vents for red and cast Redline Break.","A shock land may enter tapped safely or untapped by paying 2 life. Your puzzle starts at only 4 life."),
 item("Life Is a Resource","shock-land","life","Plan both wards before paying life. A shock land's 2-life payment can save a full turn.","Choose your red and black sources without letting your life total hit zero.","Tempo and remaining life are part of the mana puzzle. Paying life without a plan can lose the level."),
 item("Pain Lands","pain-land","life","Underground River can make colorless mana without damage or blue/black mana at the cost of 1 life.","Track your last life point as you decide when to take colored mana.","Colored pain-land mana costs life; unrestricted colorless production does not."),
 item("Check Your Types","check-land","land-types","Drowned Catacomb enters untapped only if you already control an Island or Swamp.","Sequence the Swamp and Catacomb land drops to make the required colors available in time.","Check lands look for land types, not just a land's name or color."),
 item("Generic vs Colorless","generic-cost","costs","A number such as {1} in a cost is generic: any one mana can pay it. Red {R} specifically needs red.","Use Wastes for colorless mana and preserve red for the red symbol.","True colorless {C} is a distinct mana type; generic {1} is a flexible payment requirement."),
 item("Save the Essential Color","resource-allocation","costs","The second ward needs red plus one generic mana. Do not spend the only red source on a generic requirement.","Tap lands with the later spell in mind; choose which mana pays which symbols.","A correct total amount of mana is not enough if the required colors get used up."),
 item("Fetching a Land","fetch-land","search","Play Scalding Tarn. It can pay 1 life and sacrifice itself to search for an Island or Mountain.","Choose the Mountain so the red ward can be cast this turn.","Fetch abilities are activated abilities, not additional land plays."),
 item("Fetching and Sequencing","fetch-land","search","Think through the blue and red costs before choosing your fetch target.","Fetch the right typed land and coordinate it with the land already on the battlefield.","A fetched land may provide a missing color, but the wrong choice can strand a later ward."),
 item("Shock and Awe","shock-land","life","You eventually need two red mana at once. Decide where to spend life before playing the shock land.","Make sure the final turn has two untapped red-producing lands.","A shock land's entry choice changes your available mana this turn."),
 item("A Spell That Untaps","untap","spells","Rewind the Mechanism is a special puzzle spell that untaps a land after resolving. Plan what that untap accomplishes.","Choose the tapped mana source you will need again for Crack the Beacon.","Some spells can refresh resources. This is a specifically modeled puzzle effect, not a general mana rule."),
 item("Bounce Lands","bounce-land","lands","Simic Growth Chamber enters tapped and returns a land to your hand. Plan which land to replay.","When Growth Chamber is untapped it produces BOTH green and blue mana on one tap.","Some lands make more than one mana, while their enter-the-battlefield cost changes your tempo."),
 item("The False Shortcut","life-efficiency","life","Shivan Reef and Steam Vents can both fix colors. Compare the cost of each route.","Try to supply your blue mana with the lowest life loss across both wards.","A winning route can be efficient or wasteful. Life total is part of the optimization."),
 item("Three Wards, Four Turns","planning","sequencing","Plan the complete sequence: first blue and red, then double black and red, then white-blue-black.","Before your first land drop, identify which land needs to produce each essential color in the last two wards.","Good Commander mana decisions account for future spells and scarce colored sources, not just the next tap."),
 item("Sol Ring","mana-rock","artifacts","Tap Sol Ring for two colorless mana, then tap Island for blue. Cast the spell that needs {C}{C}{U}.","You can use both colorless mana from the artifact and blue from a land.","Sol Ring is an artifact with a tap mana ability, not a land or mana spell."),
 item("Azorius Signet","mana-filter","artifacts","Tap Wastes for colorless mana, pay that {1} to activate Azorius Signet, then add white and blue together.","Spend input mana before the Signet produces anything. Island supplies the additional blue.","Some mana abilities have activation costs; the two mana appear after payment."),
 item("Dark Ritual","ritual","spells","Tap your Swamp to add {B}, then tap Dark Ritual in your hand to cast it by paying that black mana.","The ritual produces three black mana when it resolves. Cast the ward with those three mana.","Dark Ritual is an instant spell, not a mana ability. It costs {B}, adds {B}{B}{B}, and goes to the graveyard."),
 item("Mana Pipelines","filter","artifacts","Make colorless mana with Wastes or Sol Ring. Use it to power the Signet; use a blue or red mana to power Cascade Bluffs.","The filter produces two mana of your chosen colors. Preserve enough colorless, red and blue to pay the entire spell.","Mana conversion is a chain of legal payments and outputs, not free color changes."),
 item("Pyretic Ritual","ritual","spells","Tap Mountain for {R} and Wastes for {C}. Use {1}{R} to cast Pyretic Ritual from hand.","Your one-shot instant produces three red mana. Cast the red ward.","Ritual spells accelerate mana temporarily, but cannot be replayed after resolving."),
 item("Ancient Ziggurat","restricted-mana","artifacts","Tap Ancient Ziggurat for the green mana in this creature spell's cost, then tap Island for blue.","The spell is a creature, so the restricted mana is legal. This source could not pay for a sorcery ward.","Restricted mana only pays costs permitted by its source's rules text."),
 item("Urborg and Cabal Coffers","scaling-mana","lands","Tap Sol Ring for two colorless mana. Pay {2} and tap Cabal Coffers to add black mana equal to your Swamps.","With Urborg on the battlefield, Coffers and Urborg themselves are also Swamps. Tap a remaining Swamp to reach five black.","Static land type effects can change how much mana scaling lands produce."),
 item("Lotus Field","multi-output","lands","Tap Lotus Field and choose blue. It produces three blue mana together; Island supplies the fourth.","Count three mana from one land tap. You do not tap Lotus Field three separate times.","Some lands produce multiple mana in one activation. The entry sacrifice of Lotus Field occurred before this snapshot.")
]);
export function lessonNote(index,level,state){
 const meta=SAGE_LESSONS[index];if(!meta)return null;
 if(state.stage>=level.stages.length)return {...meta,step:"completed",body:meta.why};
 const spell=level.stages[state.stage],pool=state.pool||{},hasMana=Object.values(pool).some(n=>n>0),field=state.field||[],hand=state.hand||[];
 const mixed=["W","U","B","R","G"].filter(c=>pool[c]>0).length>=2;
 let body=meta.opening,step="begin";
 if(index===4&&state.stage>0){body=mixed?"You mixed blue and red successfully! Click CAST SPELL to pay both color requirements.":meta.progress;step=mixed?"ready":"mix";}
 else if(index===4){body=hasMana?"Blue mana is in your cauldron. Cast Quiet the Sentinel, then gather blue and red for the next ward.":meta.opening;step=hasMana?"blue":"begin";}
 else if(index===0&&hasMana){body="The blue bubble reached the cauldron. Click CAST SPELL to pay {U} and break the seal.";step="ready";}
 else if(index===1&&hand.length===0){body=hasMana?"Red mana is ready. Cast Ignite the Door.":meta.progress;step=hasMana?"ready":"tap";}
 else if(index!==4&&(state.stage>0||hasMana||field.some(f=>f.tapped))){body=meta.progress;step=hasMana?"ready":"progress";}
 return {...meta,body,step,mixed};
}
export const SAGE_TAG_TO_LESSON=Object.freeze({
 "basic-land":0,"land-drop":1,"turns":2,"dual-land":3,"multicolor-cost":4,
 "shock-land":5,"pain-land":7,"check-land":8,"generic-cost":9,
 "resource-allocation":10,"fetch-land":11,"untap":14,"bounce-land":15,
 "life-efficiency":16,"planning":17,
 "artifact":18,"mana-rock":18,"ritual":20,"filter":21,"mana-engine":24
});
export function relevantLesson(level){
 // Point challenged players to an actual related existing lesson. These are
 // fundamentals, not invented lessons for advanced spells not yet taught.
 const family=level.mastery?.family;
 if(family==="finale")return 17; // multi-turn full-route planning
 if(family==="tide")return 3;   // Island land types / dual sources
 if(family==="geyser")return 17; // opponent-dependent resource planning
 if(family==="rite")return 22;  // one-shot red-mana rituals
 if(family==="key")return 14;   // untapping a mana source
 if(family==="prism")return 19; // paid mana filtering
 const cards=[...level.field,...level.hand,...level.library].map(x=>x.card);
 if(cards.some(x=>x==="ritual"))return 20;
 if(cards.some(x=>x==="pyretic"))return 22;
 if(cards.some(x=>x==="coffers"||x==="urborg"||x==="nykthos"))return 24;
 if(cards.some(x=>x==="lotus"))return 25;
 if(cards.some(x=>x==="signet"))return 19;
 if(cards.some(x=>x==="bluffs"))return 21;
 if(cards.some(x=>x==="solring"))return 18;
 if(cards.some(x=>x.startsWith("fetch")))return 11;
 if(cards.some(x=>x.startsWith("shock")))return 5;
 if(cards.some(x=>x.startsWith("pain")))return 7;
 if(cards.includes("bounceUG"))return 15;
 if(level.stages.some(s=>Object.keys(s.cost).filter(k=>k!=="N").length>1))return 4;
 return 0;
}
