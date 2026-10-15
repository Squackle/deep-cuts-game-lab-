import {trapSignal} from "./trap-assist.js";
export function newTraining(){return {phase:"steer",turned:false,complete:false};}
/** Unranked first-capture coaching; no player profile, replay or engine writes. */
export function trainingProgress(coach,run,{turned=false}={}){
 if(!coach||!run||run.mode!=="hunt")return null;
 coach.turned ||= turned;
 if(run.kills>0){coach.phase="complete";coach.complete=true}
 else if(!coach.turned)coach.phase="steer";
 else if(run.enemies.some(enemy=>trapSignal(run,enemy)!==null))coach.phase="close";
 else coach.phase="trap";
 return ({steer:"FIRST HUNT · SWIPE OR PRESS ARROWS TO TURN",
  trap:"TRAP THE SKITTER · BLOCK ITS EXITS WITH YOUR TRAIL",
  close:"AMBER WARNING · THE PREY HAS ONE EXIT OR NONE",
  complete:"FIRST CAPTURE! · YOU KNOW HOW TO HUNT"})[coach.phase];
}
