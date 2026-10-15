// Mana Heist playtest — deterministic, dependency-free puzzle engine.
export const ENGINE_VERSION = "mh-core-0.1.0";
export const FAMILIES = ["sun", "tide", "shadow", "ember", "grove"];
const DIRECTIONS = [[0,-1],[1,0],[0,1],[-1,0]];
const ERROR = (error) => ({ok:false,error});
const own = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key);
export function validateLevel(level) {
  if (!level || typeof level !== "object" || level.engineVersion !== ENGINE_VERSION) throw Error("Incorrect engine version");
  if (!/^[a-z0-9-]{3,48}$/.test(level.id || "")) throw Error("Invalid level ID");
  if (!Number.isInteger(level.width) || !Number.isInteger(level.height) || level.width < 2 || level.width > 8 || level.height < 1 || level.height > 8) throw Error("Invalid board dimensions");
  if (!["global","routed"].includes(level.routing)) throw Error("Invalid routing mode");
  if (!Number.isInteger(level.moveBudget) || level.moveBudget < 1 || level.moveBudget > 50) throw Error("Invalid move budget");
  validateVector(level.goal, true);
  if (!Array.isArray(level.components) || !level.components.length || level.components.length > 64) throw Error("Invalid components");
  const ids = new Set(), locations = new Set();
  let vaults = 0;
  for (const c of level.components) {
    if (!c || !/^[a-zA-Z0-9-]{1,40}$/.test(c.id || "") || ids.has(c.id)) throw Error("Duplicate or invalid component ID");
    ids.add(c.id);
    if (!["source","dual","converter","relay","vault","wall"].includes(c.type)) throw Error("Unsupported component type");
    if (!Array.isArray(c.at) || c.at.length !== 2 || !c.at.every(Number.isInteger) || c.at[0] < 0 || c.at[0] >= level.width || c.at[1] < 0 || c.at[1] >= level.height) throw Error("Invalid component position");
    const location = c.at.join(",");
    if (locations.has(location)) throw Error("Overlapping components");
    locations.add(location);
    if (c.type === "vault") vaults++;
    if (["source","dual","converter"].includes(c.type) && (!Number.isInteger(c.uses) || c.uses < 1 || c.uses > 4)) throw Error("Invalid device uses");
    if (c.type === "source") validateVector(c.output,true);
    if (c.type === "dual") {
      if (!Array.isArray(c.options) || c.options.length !== 2) throw Error("Dual requires exactly two choices");
      for (const option of c.options) validateVector(option,true);
    }
    if (c.type === "converter") { validateVector(c.input,true); validateVector(c.output,true); }
    if (c.type === "relay" && (!["straight","corner"].includes(c.shape) || !Number.isInteger(c.rotation) || c.rotation < 0 || c.rotation > 3 || !Number.isInteger(c.turns) || c.turns < 1 || c.turns > 5)) throw Error("Invalid relay");
  }
  if (vaults !== 1) throw Error("Exactly one vault is required");
  if (level.routing === "routed" && !level.components.some(c => c.type === "relay")) throw Error("Routed puzzles need a relay");
  return true;
}
function validateVector(v, nonzero=false) {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw Error("Invalid energy vector");
  let n = 0;
  for (const [k,x] of Object.entries(v)) {
    if (!FAMILIES.includes(k) || !Number.isInteger(x) || x < 0 || x > 5) throw Error("Invalid energy amount");
    n += x;
  }
  if (n > 12 || (nonzero && n === 0)) throw Error("Empty or oversized energy vector");
}
export function initialState(level) {
  validateLevel(level);
  const energy = Object.fromEntries(FAMILIES.map(f => [f,0]));
  const uses = {}, rotations = {}, turns = {};
  for (const c of level.components) {
    if (own(c,"uses")) uses[c.id] = c.uses;
    if (c.type === "relay") { rotations[c.id] = c.rotation; turns[c.id] = c.turns; }
  }
  return {energy,uses,rotations,turns,moves:0,opened:false};
}
const ports = (c,state) => {
  if (!c || c.type === "wall") return [];
  if (c.type !== "relay") return [0,1,2,3];
  const base = c.shape === "straight" ? [0,2] : [0,1];
  return base.map(p => (p+state.rotations[c.id])%4);
};
export function reachableIds(level,state) {
  if (level.routing === "global") return new Set(level.components.map(c=>c.id));
  const tiles = new Map(level.components.map(c=>[c.at.join(","),c]));
  const vault = level.components.find(c=>c.type==="vault");
  const reached = new Set([vault.id]), queue = [vault];
  for (let i=0;i<queue.length;i++) {
    const here=queue[i];
    for (const direction of ports(here,state)) {
      const [dx,dy]=DIRECTIONS[direction], neighbour=tiles.get((here.at[0]+dx)+","+(here.at[1]+dy));
      if (neighbour && !reached.has(neighbour.id) && ports(neighbour,state).includes((direction+2)%4)) {
        reached.add(neighbour.id);queue.push(neighbour);
      }
    }
  }
  return reached;
}
function sufficient(pool,cost){return Object.entries(cost).every(([f,n])=>pool[f]>=n);}
function add(pool,vector,sign=1) {
  const next = {...pool};for(const [k,n] of Object.entries(vector)) next[k]+=sign*n;return next;
}
export function legalActions(level,state) {
  if (state.opened) return [];
  const connected=reachableIds(level,state), result=[];
  for (const c of level.components) {
    if (c.type === "relay" && state.turns[c.id] > 0) result.push({type:"rotate",id:c.id});
    if (!connected.has(c.id)) continue;
    if (c.type === "source" && state.uses[c.id] > 0) result.push({type:"activate",id:c.id,choice:0});
    if (c.type === "dual" && state.uses[c.id] > 0) c.options.forEach((_,choice)=>result.push({type:"activate",id:c.id,choice}));
    if (c.type === "converter" && state.uses[c.id] > 0 && sufficient(state.energy,c.input)) result.push({type:"convert",id:c.id});
  }
  if (sufficient(state.energy,level.goal)) result.push({type:"open"});
  return result;
}
export function applyAction(level,state,action) {
  if (!action || typeof action !== "object" || state.opened) return ERROR(state.opened ? "Vault already opened" : "Select a device");
  const key = JSON.stringify({type:action.type,id:action.id,choice:action.choice});
  const legal = legalActions(level,state).find(a=>JSON.stringify({type:a.type,id:a.id,choice:a.choice})===key);
  if (!legal) {
    if (action.type === "open") return ERROR("Not enough energy to break the seal");
    const c = level.components.find(c=>c.id===action.id);
    if (!c) return ERROR("Device not found");
    if (c.type === "relay") return ERROR("This relay has no turns remaining");
    if (!reachableIds(level,state).has(c.id)) return ERROR("No connected path to the vault");
    if (state.uses[c.id]===0) return ERROR("Device is exhausted");
    if (c.type==="converter") return ERROR("Insufficient energy for conversion");
    return ERROR("Action not available");
  }
  const next = {energy:{...state.energy},uses:{...state.uses},rotations:{...state.rotations},turns:{...state.turns},moves:state.moves+1,opened:state.opened};
  const c=level.components.find(c=>c.id===action.id);
  if (action.type==="rotate") {next.turns[c.id]--;next.rotations[c.id]=(next.rotations[c.id]+1)%4;}
  if (action.type==="activate") {next.uses[c.id]--;next.energy=add(next.energy,c.type==="source"?c.output:c.options[action.choice]);}
  if (action.type==="convert") {next.uses[c.id]--;next.energy=add(add(next.energy,c.input,-1),c.output);}
  if (action.type==="open") {next.energy=add(next.energy,level.goal,-1);next.opened=true;}
  return {ok:true,state:next};
}
export function stateKey(state){
  return JSON.stringify([FAMILIES.map(f=>state.energy[f]),Object.entries(state.uses).sort(),Object.entries(state.rotations).sort(),Object.entries(state.turns).sort(),state.opened]);
}
export function actionLabel(action,level){
  if(action.type==="open")return "Break the vault seal";
  const c=level.components.find(x=>x.id===action.id);
  if(action.type==="rotate")return "Rotate "+c.label;
  if(action.type==="convert")return "Convert with "+c.label;
  return "Activate "+c.label+(c.type==="dual"?" ("+Object.keys(c.options[action.choice]).join(", ")+")":"");
}
