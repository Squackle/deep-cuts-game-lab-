// Commander collection: pick one starter, unlock the rest by reaching waves in Gauntlet or Endless.
// Saved only in this browser. Sandbox shows every commander and never unlocks anything.
export const STARTERS = ["marshal", "quill", "bramble"];
export const UNLOCKS = [
 { id: "vesk", wave: 10 },
 { id: "kragg", wave: 15 },
 { starter: true, wave: 25 }
];
const KEY = "archemancy.progress.v1";

export function newProfile() { return { version: 1, starter: null, unlocked: [], last: null, bestWave: 0 }; }

export function sanitize(raw, all) {
 const p = newProfile();
 if (!raw || typeof raw !== "object") return p;
 if (STARTERS.includes(raw.starter)) p.starter = raw.starter;
 if (Array.isArray(raw.unlocked)) p.unlocked = [...new Set(raw.unlocked.filter(id => all.includes(id)))];
 if (p.starter && !p.unlocked.includes(p.starter)) p.unlocked.unshift(p.starter);
 if (!p.starter) p.unlocked = [];
 if (p.unlocked.includes(raw.last)) p.last = raw.last;
 if (Number.isInteger(raw.bestWave) && raw.bestWave > 0) p.bestWave = raw.bestWave;
 return p;
}

export function chooseStarter(p, id) {
 if (p.starter || !STARTERS.includes(id)) return false;
 p.starter = id; p.unlocked = [id]; p.last = id; return true;
}

// What a locked commander needs, for the dialog.
export function requirement(p, id) {
 if (p.unlocked.includes(id)) return null;
 const rule = UNLOCKS.find(u => u.id === id) || (STARTERS.includes(id) ? UNLOCKS.find(u => u.starter) : null);
 return rule ? "Reach wave " + rule.wave + " in Gauntlet or Endless" : "Locked";
}

// Call after each completed wave. Returns newly unlocked commander ids.
export function recordWave(p, wave, mode) {
 if (mode === "sandbox" || !p.starter || !Number.isInteger(wave)) return [];
 p.bestWave = Math.max(p.bestWave, wave);
 const fresh = [];
 for (const rule of UNLOCKS) {
  if (p.bestWave < rule.wave) continue;
  const ids = rule.starter ? STARTERS : [rule.id];
  for (const id of ids) if (!p.unlocked.includes(id)) { p.unlocked.push(id); fresh.push(id); }
 }
 return fresh;
}

export function available(p, mode, all) { return mode === "sandbox" ? all.slice() : all.filter(id => p.unlocked.includes(id)); }

export function load(storage, all) {
 try { return sanitize(JSON.parse(storage?.getItem(KEY) || "null"), all); } catch { return newProfile(); }
}
export function save(storage, p) {
 try { storage?.setItem(KEY, JSON.stringify(p)); return true; } catch { return false; }
}
