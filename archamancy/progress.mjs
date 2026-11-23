import { PERKS, PERK_COSTS } from "./engine.mjs";
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
 { id: "urza", level: 3, text: "Reach player level 3" },
 { id: "torbran", win: true, text: "Win any 25-wave Gauntlet" },
 { id: "toxrill", hard: true, text: "Win a 25-wave Gauntlet on Hard" },
 { id: "urdragon", rainbow: true, text: "Win the 25-wave Gauntlet with a tower of every color" }
];
const KEY = "archemancy.progress.v1";

export const LEVELS = ["easy", "normal", "hard"];
export function newProfile() { return { version: 1, starter: null, unlocked: [], last: null, bestWave: 0, stars: {}, difficulty: "normal", season: "summer", map: "hollow", perks: {}, badges: {}, onslaught: false, xp: 0, seen: { e: [], t: [], c: [] } }; }

export function sanitize(raw, all) {
 const p = newProfile();
 if (!raw || typeof raw !== "object") return p;
 if (LEVELS.includes(raw.difficulty)) p.difficulty = raw.difficulty;
 if (["summer", "autumn", "winter"].includes(raw.season)) p.season = raw.season;
 for (const [k, n] of Object.entries(raw.stars || {})) if (/^([a-z]+:)?(easy|normal|hard)$/.test(k) && !k.startsWith("hollow:") && Number.isInteger(n) && n >= 1 && n <= 3) p.stars[k] = n;
 if (raw.perks && typeof raw.perks === "object") for (const k of Object.keys(PERKS)) { const n = raw.perks[k]; if (Number.isInteger(n) && n >= 1 && n <= 3) p.perks[k] = n; }
 if (spentStars(p) > totalStars(p)) p.perks = {};
 if (raw.badges && typeof raw.badges === "object") for (const k of Object.keys(raw.badges)) if (BADGE.test(k) && raw.badges[k] === true) p.badges[k] = true;
 p.onslaught = raw.onslaught === true;
 if (Number.isInteger(raw.xp) && raw.xp > 0) p.xp = Math.min(raw.xp, 1e7);
 for (const k of ["e", "t", "c"]) if (Array.isArray(raw.seen?.[k])) p.seen[k] = [...new Set(raw.seen[k].filter(x => typeof x === "string" && /^[a-z]{2,20}$/.test(x)))].slice(0, 200);
 if (typeof raw.map === "string" && /^[a-z]+$/.test(raw.map)) p.map = raw.map;
 if (STARTERS.includes(raw.starter) && all.includes(raw.starter)) p.starter = raw.starter;
 if (!p.starter) return p;
 if (Array.isArray(raw.unlocked)) p.unlocked = [...new Set(raw.unlocked.filter(id => all.includes(id)))];
 if (!p.unlocked.includes(p.starter)) p.unlocked.unshift(p.starter);
 if (p.unlocked.includes(raw.last)) p.last = raw.last;
 if (Number.isInteger(raw.bestWave) && raw.bestWave > 0) p.bestWave = raw.bestWave;
 // Players from before levels keep what they had: earlier best waves count toward their level.
 if (!Number.isInteger(raw.xp) && p.bestWave > 0) p.xp = p.bestWave >= 25 || totalStars(p) > 0 ? xpToReach(MAX_LEVEL) : Math.max(xpForWaves(p.bestWave), p.bestWave >= 10 ? xpToReach(4) : 0);
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
 if (rule.level) return level(p) >= rule.level;
 if (rule.win) return totalStars(p) > 0 || (!!run.won && run.mode === "campaign");
 if (rule.hard) return Object.keys(p.stars).some(k => k.endsWith("hard")) || (!!run.won && run.mode === "campaign" && run.difficulty === "hard");
 if (rule.rainbow) return !!run.won && new Set(run.colors || []).size >= 5;
 return false;
}

// Call after each completed wave with a snapshot of the run.
// run = {wave, mode, difficulty, fallen, returns, sacrifices, won, colors}. Returns newly unlocked commander ids.
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

// Star upgrades. Every best-star result on every map and difficulty adds to the pool; perks spend from it and can be refunded any time.
export const totalStars = p => Object.values(p.stars || {}).reduce((a, b) => a + b, 0);
export const perkCost = n => PERK_COSTS.slice(0, n).reduce((a, b) => a + b, 0);
export const spentStars = p => Object.values(p.perks || {}).reduce((a, n) => a + perkCost(n), 0);
export const freeStars = p => totalStars(p) - spentStars(p);
export function buyPerk(p, k) { if (!Object.hasOwn(PERKS, k)) return false; const n = p.perks[k] || 0; if (n >= PERK_COSTS.length || freeStars(p) < PERK_COSTS[n]) return false; p.perks[k] = n + 1; return true; }
export function resetPerks(p) { const had = spentStars(p) > 0; p.perks = {}; return had; }

// Trial badges: "mono:R" for a Gauntlet won with towers of one color, "onslaught:hollow" for an Onslaught Gauntlet won on that map.
const BADGE = /^(mono:[WUBRG]|onslaught:[a-z]+)$/;
export function awardBadge(p, key) { if (!BADGE.test(key) || p.badges[key]) return false; p.badges[key] = true; return true; }
// Which badges a won Gauntlet earns. run = {won, mode, onslaught, map, colors: color of every tower built}.
export function trialBadges(run) { if (!run?.won || run.mode !== "campaign") return []; const out = []; const set = new Set(run.colors || []); if (set.size === 1) out.push("mono:" + [...set][0]); if (run.onslaught) out.push("onslaught:" + (run.map || "hollow")); return out; }

// Player level. Every wave cleared outside the Proving Grounds gives 10 + wave XP; level n to n + 1 takes 60 × n XP.
// Basic towers (one per color) are open from the start; the rest open over the first levels.
export const LEVEL_UNLOCKS = {
 2: { towers: ["judgment", "storm"] },
 3: { towers: ["hex", "beast"], maps: ["confluence"] },
 4: { towers: ["chapel", "goblin"], modes: ["endless"] },
 5: { towers: ["library", "thorn"], modes: ["onslaught"] },
 6: { towers: ["foundry", "mirror"], maps: ["frostfen", "pass"] }
};
export const MAX_LEVEL = 6;
export const xpToReach = n => 30 * n * (n - 1);
export const xpForWaves = w => { let x = 0; for (let i = 1; i <= w; i++) x += 10 + i; return x; };
export function level(p) { let n = 1; while (n < MAX_LEVEL && p.xp >= xpToReach(n + 1)) n++; return n; }
export function unlockLevel(kind, id) { for (const [n, u] of Object.entries(LEVEL_UNLOCKS)) if (u[kind]?.includes(id)) return Number(n); return 1; }
export const isOpen = (p, kind, id) => level(p) >= unlockLevel(kind, id);
export function lockedTowers(p) { return Object.values(LEVEL_UNLOCKS).flatMap(u => u.towers || []).filter(id => !isOpen(p, "towers", id)); }
// Adds XP for cleared waves; returns the levels gained, each with what it opens.
export function gainXp(p, waves, mode) { if (mode === "sandbox" || !Array.isArray(waves)) return []; const before = level(p); for (const w of waves) if (Number.isInteger(w) && w > 0) p.xp += 10 + w; const after = level(p), out = []; for (let n = before + 1; n <= after; n++) out.push({ level: n, ...(LEVEL_UNLOCKS[n] || {}) }); return out; }
// Codex: first sightings of enemies (e), towers (t) and cards (c). Returns true when something new was added.
export function see(p, kind, ids) { const list = p.seen[kind]; if (!list) return false; let added = false; for (const id of ids) if (!list.includes(id) && list.length < 200) { list.push(id); added = true; } return added; }
