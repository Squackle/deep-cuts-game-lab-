// Booster pack art and the pack-opening show, in the spirit of Balatro's packs: a foil wrapper per pack kind, a shake and
// tear-open burst, cards dealt face down then flipped one by one with rarity flair, and a pick animation.
// Pure DOM + CSS (transforms and opacity only, so it stays smooth on phones). main.mjs owns the game logic and buttons.

// Wrapper look per pack kind: an original emblem (SVG path on a 64x64 box) and a short tagline.
export const PACK_LOOK = {
 spell: { tag: "Sorcery & Instants", emblem: '<path d="M37 3 13 37h14l-6 24 29-37H35l7-21z"/>' },
 ritual: { tag: "Dark Rites", emblem: '<path d="M38 7a25 25 0 1 0 19 40A21 21 0 1 1 38 7z"/><circle cx="48" cy="17" r="3"/><circle cx="56" cy="29" r="2"/><circle cx="44" cy="30" r="1.6"/>' },
 land: { tag: "Basic Lands", emblem: '<circle cx="46" cy="16" r="7"/><path d="M2 56 22 22l9 14 8-10 23 30z"/>' },
 relic: { tag: "Ancient Artifacts", emblem: '<path d="M18 9h28l13 15-27 33L5 24z"/><path d="M5 24h54M18 9l9 15 5 33M46 9l-9 15-5 33" fill="none" stroke="#0006" stroke-width="2.2"/>' },
 forbidden: { tag: "Do Not Open", emblem: '<path d="M2 32C11 18 21 12 32 12s21 6 30 20c-9 14-19 20-30 20S11 46 2 32z"/><ellipse cx="32" cy="32" rx="5" ry="13" fill="#1a0508"/><circle cx="32" cy="32" r="19" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 4"/>' }
};

// MTG-style rarity for the reveal: common, uncommon (silver), rare (gold), mythic (orange-red).
// Relics carry their own rarity; Forbidden cards are the mythics; spells are tiered by mana cost.
export function rarityOf(kind, d) {
 if (kind === "forbidden") return "mythic";
 if (kind === "relic") return d?.rarity || "common";
 if (kind === "boon") return "uncommon";
 if (kind === "spell") { const c = d?.cost || 0; return c >= 65 ? "rare" : c >= 45 ? "uncommon" : "common"; }
 return "common";
}
export const RARITY_LABEL = { common: "Common", uncommon: "Uncommon", rare: "Rare", mythic: "Mythic" };

// Crimped (zigzag) top and bottom edges like a foil pack, and a ragged tear line near the top. Values are % of the pack.
const TEAR = 17;
function edge(y, teeth, depth, dir) { const out = []; for (let i = 0; i <= teeth * 2; i++) out.push([i * 50 / teeth, y + (i % 2 ? depth * dir : 0)]); return out; }
function rag(y) { const out = []; for (let i = 0; i <= 12; i++) out.push([i * 100 / 12, y + [0, 2.2, -.6, 1.6, -1.4, 2.4, 0, 1.2, -1.8, 1.8, -.4, 1.4, 0][i]]); return out; }
const poly = pts => "polygon(" + pts.map(([x, y]) => x.toFixed(2) + "% " + y.toFixed(2) + "%").join(",") + ")";
export const CLIP = {
 cap: poly([...edge(0, 10, 2.4, 1), ...rag(TEAR).reverse()]),
 body: poly([...rag(TEAR), ...edge(100, 10, 2.4, -1).reverse()]),
 whole: poly([...edge(0, 10, 2.4, 1), ...edge(100, 10, 2.4, -1).reverse()])
};

// The pack wrapper. `split` draws it as two layers (cap above the tear line, body below) so the cap can be torn off.
export function packEl(kind, P, { big = false, split = false, doc = document } = {}) {
 const L = PACK_LOOK[kind] || PACK_LOOK.spell, root = doc.createElement("div"), title = P.name.replace(/ Pack$/, "");
 root.className = "pk pk-" + kind + (big ? " pk-big" : "");
 const face = '<div class="pk-pattern"></div><div class="pk-brand">Archemancy</div>'
  + '<div class="pk-medal"><svg viewBox="0 0 64 64" aria-hidden="true" fill="currentColor">' + L.emblem + "</svg></div>"
  + '<div class="pk-title' + (title.length > 6 ? " pk-long" : "") + '">' + title + '</div><div class="pk-tag">' + L.tag + "</div>"
  + '<div class="pk-count">Choose 1 of ' + P.show + '</div><div class="pk-foil"></div>';
 const layer = (cls, clip) => { const d = doc.createElement("div"); d.className = "pk-layer " + cls; d.style.clipPath = clip; d.innerHTML = face; return d; };
 if (split) root.append(layer("pk-body", CLIP.body), layer("pk-cap", CLIP.cap));
 else root.append(layer("pk-whole", CLIP.whole));
 root.setAttribute("role", "img"); root.setAttribute("aria-label", P.name);
 return root;
}

// Timeline (ms). Tapping the stage after the tear skips ahead to the finished reveal.
export const TIMING = { drop: 0, autoOpen: 1500, shake: 750, burst: 450, deal: 90, dealDur: 520, flipGap: 430, flipDur: 520 };

// Run the opening show. `slots` are the card slot elements (already in the stage, face down) with dataset.rarity set.
// Returns { open(), finish(), cancel() }. onReady fires once every card is face up and can be picked.
export function openShow({ stage, slots, sfx, reduced = false, onReady = () => {}, onOpen = () => {}, timers = globalThis }) {
 const ids = []; let phase = "sealed", ended = false;
 const later = (fn, ms) => { ids.push(timers.setTimeout(fn, ms)); };
 const cancel = () => { ids.splice(0).forEach(id => timers.clearTimeout(id)); };
 const flip = (slot, i, quiet) => {
  if (slot.classList.contains("pk-up")) return;
  slot.classList.add("pk-in", "pk-up");
  if (quiet) return;
  sfx?.play("cardFlip", { step: i });
  const r = slot.dataset.rarity;
  if (r === "rare" || r === "mythic" || r === "uncommon") later(() => { slot.classList.add("pk-flare"); sfx?.play(r === "uncommon" ? "revealUncommon" : r === "mythic" ? "revealMythic" : "revealRare"); }, TIMING.flipDur * .45);
 };
 const finish = () => {
  if (ended) return; ended = true; cancel(); phase = "done";
  stage.classList.remove("pk-sealed", "pk-shaking"); stage.classList.add("pk-opened", "pk-dealt", "pk-done");
  slots.forEach((s, i) => flip(s, i, true));
  onReady();
 };
 const deal = () => {
  phase = "deal"; stage.classList.add("pk-dealt");
  const sr = stage.getBoundingClientRect?.(), cx = sr ? sr.left + sr.width / 2 : 0, cy = sr ? sr.top + sr.height * .35 : 0;
  slots.forEach((s, i) => {
   const r = s.getBoundingClientRect?.();
   if (r) { s.style.setProperty("--fx", (cx - (r.left + r.width / 2)).toFixed(0) + "px"); s.style.setProperty("--fy", (cy - (r.top + r.height / 2)).toFixed(0) + "px"); }
   s.style.setProperty("--tilt", ((i - (slots.length - 1) / 2) * 9).toFixed(1) + "deg");
   later(() => { s.classList.add("pk-in"); sfx?.play("cardDeal"); }, i * TIMING.deal);
  });
  const start = slots.length * TIMING.deal + TIMING.dealDur;
  slots.forEach((s, i) => later(() => flip(s, i, false), start + i * TIMING.flipGap));
  later(finish, start + (slots.length - 1) * TIMING.flipGap + TIMING.flipDur + 120);
 };
 const open = () => {
  if (phase !== "sealed") { if (phase !== "shake") finish(); return; }
  cancel(); phase = "shake"; onOpen();
  stage.classList.add("pk-shaking"); sfx?.play("packShake");
  later(() => { phase = "burst"; stage.classList.remove("pk-shaking"); stage.classList.add("pk-opened"); sfx?.play("packTear"); }, TIMING.shake);
  later(deal, TIMING.shake + TIMING.burst);
 };
 if (reduced) { finish(); return { open, finish, cancel, get phase() { return phase; } }; }
 stage.classList.add("pk-sealed");
 later(open, TIMING.autoOpen);
 return { open, finish, cancel, get phase() { return phase; } };
}

// Sparks for the tear burst and rare reveals: a fixed number of spans flung out at even angles (CSS does the motion).
export function sparks(doc, n, cls) {
 const box = doc.createElement("div"); box.className = "pk-sparks " + (cls || "");
 for (let i = 0; i < n; i++) { const s = doc.createElement("i"), a = i / n * Math.PI * 2 + (i % 3) * .17, d = 70 + (i * 37 % 60);
  s.style.setProperty("--sx", (Math.cos(a) * d).toFixed(0) + "px"); s.style.setProperty("--sy", (Math.sin(a) * d).toFixed(0) + "px"); s.style.setProperty("--sd", (i % 4) * 40 + "ms"); box.append(s); }
 return box;
}
