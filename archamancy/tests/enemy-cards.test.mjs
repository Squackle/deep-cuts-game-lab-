import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine} from "../engine.mjs";
// Enemies wear real Magic cards (checked on Scryfall 2026-11-23). The card is only the name and look:
// stats, wave mix and abilities must not move, and the extra card fields must stay out of saved enemy state.
const cards={raider:"Goblin Raider",runner:"Monastery Swiftspear",armored:"Indomitable Ancients",wing:"Carrion Crow",mage:"Prodigal Sorcerer",regen:"Mossbridge Troll",titan:"Primeval Titan",stalker:"Invisible Stalker",warden:"Kappa Cannoneer",golem:"Darksteel Juggernaut",grimgut:"Lovisa Coldeyes",matron:"Oona, Queen of the Fae",colossus:"Darksteel Colossus",hierophant:"Iona, Shield of Emeria",tyrant:"Emrakul, the Aeons Torn"};
const stats={raider:[38,12,0,0],runner:[27,19,0,0],armored:[95,8,45,5],wing:[42,16,0,15],mage:[62,11,5,45],regen:[120,9,10,15],titan:[650,5,30,25],stalker:[45,16,0,10],warden:[110,9,25,100],golem:[150,7,100,20],grimgut:[1300,6,25,10],matron:[1600,6,10,35],colossus:[1900,4,100,30],hierophant:[2050,5,30,100],tyrant:[3200,4,40,40]};
test("every enemy is a real card, with its old stats and a role, type line and short name",()=>{const g=createEngine(1);assert.deepEqual(Object.keys(g.types).sort(),Object.keys(cards).sort());
 for(const [k,t] of Object.entries(g.types)){assert.equal(t.name,cards[k]);assert.deepEqual([t.hp,t.speed,t.armor,t.resist],stats[k],k);assert.ok(t.role&&t.card&&t.short,k);assert.ok(!Object.keys(t).some(x=>x==="role"||x==="card"||x==="short"),k+" card fields must not be copied into enemy state");}});
test("boss alerts use the card's short name",()=>{const g=createEngine(1);assert.equal(g.types.grimgut.short,"Lovisa");assert.equal(g.types.tyrant.short,"Emrakul");assert.equal(g.types.raider.short,"Goblin Raider");assert.match(g.types.matron.trait,/Invisible Stalkers/);});
