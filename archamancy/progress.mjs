// Commander collection: pick one starter, unlock the rest through play in Gauntlet or Endless.
// Saved only in this browser. Proving Grounds shows every commander and never unlocks anything.
export const STARTERS = ["krenko", "talrand", "omnath"];
// Battle stats (fallen, returns, sacrifices) count within a single run.
export const UNLOCKS = [
 { id: "edgar", wave: 10, text: "Reach wave 10 in Gauntlet or Endless" },
 { id: "lightpaws", wave: 15, text: "Reach wave 15 in Gauntlet or Endless" },
 { starter: true, wave: 25, text: "Reach wave 25 in Gauntlet or Endless" },
 { id: "meren", stat: "returns", min: 10, text: "Return 10 fallen troops in one battle" },
 { id: "teysa", stat: "fallen", min: 200, text: "Lose 200 troops in one battle" },
 { id: "korvold", stat: "sacrifices", min: 50, text: "Sacrifice 50 troops in one battle" },
 { id: "atraxa", endless: 30, text: "Reach wave 30 in Endless" },
 { id: "urdragon", rainbow: true, text: "Win the 25-wave Gauntlet with a tower of every color" }
];
const KEY = "archemancy.progress.v1";

export const LEVELS = ["easy", "normal", "hard"];
export function newProfile() { return { version: 1, starter: null, unlocked: [], last: null, bestWave: 0, stars: {}, difficulty: "normal", map: "hollow" }; }

export function sanitize(raw, all) {
 const p = newProfile();
 if (!raw || typeof raw !== "object") return p;
 if (LEVELS.includes(raw.difficulty)) p.difficulty = raw.difficulty;
 for (const [k, n] of Object.entries(raw.stars || {})) if (/^([a-z]+:)?(easy|normal|hard)$/.test(k) && !k.startsWith("hollow:") && Number.isInteger(n) && n >= 1 && n <= 3) p.stars[k] = n;
 if (typeof raw.map === "string" && /^[a-z]+$/.test(raw.map)) p.map = raw.map;
 if (STARTERS.includes(raw.starter) && all.includes(raw.starter)) p.starter = raw.starter;
 if (!p.starter) return p;
 if (Array.isArray(raw.unlocked)) p.unlocked = [...new Set(raw.unlocked.filter(id => all.includes(id)))];
 if (!p.unlocked.includes(p.starter)) p.unlocked.unshift(p.starter);
 if (p.unlocked.includes(raw.last)) p.last = raw.last;
 if (Number.isInteger(raw.bestWave) && raw.bestWave > 0) p.bestWave = raw.bestWave;
 return p;
}

export function chooseStarter(p, id) {
 if (p.starter || !STARTERS.includes(id)) return false;
 p.starter = id; p.unlocked = [id]; p.last = id; return true;
}

function ruleFor(id) { return UNLOCKS.find(u => u.id === id) || (STARTERS.includes(id) ? UNLOCKS.find(u => u.starter) : null); }

// What a locked commander needs, for the dialog.
export function requirement(p, id) {
 if (p.unlocked.includes(id)) return null;
 return ruleFor(id)?.text || "Locked";
}

function met(rule, p, run) {
 if (rule.wave) return p.bestWave >= rule.wave;
 if (rule.stat) return (run[rule.stat] || 0) >= rule.min;
 if (rule.endless) return run.mode === "endless" && run.wave >= rule.endless;
 if (rule.rainbow) return !!run.won && new Set(run.colors || []).size >= 5;
 return false;
}

// Call after each completed wave with a snapshot of the run.
// run = {wave, mode, fallen, returns, sacrifices, won, colors}. Returns newly unlocked commander ids.
export function recordRun(p, run) {
 if (!run || run.mode === "sandbox" || !p.starter || !Number.isInteger(run.wave)) return [];
 p.bestWave = Math.max(p.bestWave, run.wave);
 const fresh = [];
 for (const rule of UNLOCKS) {
  if (!met(rule, p, run)) continue;
  for (const id of rule.starter ? STARTERS : [rule.id]) if (!p.unlocked.includes(id)) { p.unlocked.push(id); fresh.push(id); }
 }
 return fresh;
}

// Best Gauntlet stars per battlefield and difficulty. The Hollow Road keeps the original keys ("normal"); other maps use "map:normal".
export const starKey = (level, map = "hollow") => map === "hollow" ? level : map + ":" + level;
export function bestStars(p, level, map = "hollow") { return p.stars[starKey(level, map)] || 0; }
// Returns true when this beats the saved best.
export function recordStars(p, level, stars, map = "hollow") { const k = starKey(level, map); if (!LEVELS.includes(level) || !/^[a-z]+$/.test(map) || !Number.isInteger(stars) || stars < 1 || stars > 3 || (p.stars[k] || 0) >= stars) return false; p.stars[k] = stars; return true; }

export function available(p, mode, all) { return mode === "sandbox" ? all.slice() : all.filter(id => p.unlocked.includes(id)); }

export function load(storage, all) {
 try { return sanitize(JSON.parse(storage?.getItem(KEY) || "null"), all); } catch { return newProfile(); }
}
export function save(storage, p) {
 try { storage?.setItem(KEY, JSON.stringify(p)); return true; } catch { return false; }
}
