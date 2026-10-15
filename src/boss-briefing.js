/**
 * Encounter dossier copy and presentation-only pause/countdown.
 * Does not mutate the simulation, advance boss cooldowns or consume RNG.
 */
export const BRIEFING_SECONDS=3;
export const BRIEFINGS=Object.freeze({
 stalker:Object.freeze({name:"BURROW STALKER",rank:"MINIBOSS",title:"THE AMBUSH BELOW",tag:"SUBTERRANEAN PREDATOR",captures:2,accent:"#b9a06c",
  mechanics:Object.freeze(["BURROW DASH · After 10 active seconds, burrows exactly 5 tiles away.","A marked exit warns you for half a second before the leap.","Two captures to defeat it; each phase begins at a safe new location."]),
  tip:"Watch the marked exit. Cut off escape routes with your body, not your head."}),
 weaver:Object.freeze({name:"TUNNEL WEAVER",rank:"MINIBOSS",title:"THE SILKEN SNARE",tag:"CAVERN TRAPMASTER",captures:2,accent:"#b4a58c",
  mechanics:Object.freeze(["WEB SNARE · Places one web every 5 active seconds.","Webs last 15 seconds. They stun YOU for 2 seconds while the Weaver keeps moving and spinning webs.","Up to three webs can remain active. Capture the Weaver twice."]),
  tip:"Avoid the marked web tiles; leave a safe route through narrow corridors."}),
 warden:Object.freeze({name:"HATCHERY WARDEN",rank:"FULL BOSS",title:"GUARDIAN OF THE BROOD",tag:"CAVERN SENTINEL",captures:3,accent:"#d0b071",
  mechanics:Object.freeze(["BROOD SEAL · Every 10 active seconds, seals up to 3 nearby tiles.","Tiles warn for 1.4 seconds, then block your path for 3.5 seconds.","Three captures to win. The Warden predicts escape routes."]),
  tip:"Keep a retreat lane. The marked tiles are about to become solid."}),
 broodmother:Object.freeze({name:"BROODMOTHER",rank:"FULL BOSS",title:"MOTHER OF THE DEEP",tag:"ANCIENT HIVE SOVEREIGN",captures:3,accent:"#b8a47c",
  mechanics:Object.freeze(["EGG BLOOM · Every 6.5 active seconds, marks four distant tiles around her.","After 0.9 seconds, those eggs harden and block travel for 3.2 seconds.","Three captures defeat the Broodmother. Keep an escape lane open."]),
  tip:"Keep wide corridors clear. Her marked eggs form temporary gates around the nest."}),
 guardian:Object.freeze({name:"RIFT GUARDIAN",rank:"FULL BOSS",title:"THE FRACTURED DEPTH",tag:"VOID SENTINEL",captures:3,accent:"#bc9cc9",
  mechanics:Object.freeze(["RIFT PULSE · Every 4 active seconds, threatens up to 4 tiles.","Tiles warn for 1.4 seconds, then become rifts for 2.2 seconds.","Three captures to win. The Guardian plans ahead."]),
  tip:"Avoid warning tiles and secure open territory before tightening your trap."})
});
export class BossBriefingGate {
 constructor(){this.reset()}
 reset(){this.phase="idle";this.kind=null;this.remainingMs=0;this.lastTime=null;this.seen=new WeakSet()}
 get blocking(){return this.phase!=="idle"}
 get seconds(){return this.phase==="countdown"?Math.max(1,Math.ceil(this.remainingMs/1000)):0}
 begin(encounter){
  if(this.blocking||!encounter||typeof encounter!=="object"||!BRIEFINGS[encounter.kind]||this.seen.has(encounter))return false;
  this.seen.add(encounter);this.kind=encounter.kind;this.phase="briefing";this.remainingMs=0;this.lastTime=null;return true;
 }
 resume(now){
  if(this.phase!=="briefing"||!Number.isFinite(now))return false;
  this.phase="countdown";this.remainingMs=BRIEFING_SECONDS*1000;this.lastTime=now;return true;
 }
 advance(now){
  if(this.phase!=="countdown"||!Number.isFinite(now))return false;
  this.remainingMs=Math.max(0,this.remainingMs-Math.max(0,now-this.lastTime));
  this.lastTime=Math.max(this.lastTime,now); // Ignore out-of-order animation timestamps.
  if(this.remainingMs===0){this.phase="idle";this.kind=null;this.lastTime=null;return true}
  return false;
 }
 interrupt(){
  if(this.phase!=="countdown")return false;
  this.phase="briefing";this.remainingMs=0;this.lastTime=null;return true;
 }
}
