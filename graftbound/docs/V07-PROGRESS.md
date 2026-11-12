# GRAFTBOUND v0.7 — progress (milestone delivery)

Base: Game Lab `main` @ `529288df552ad0b6c24507f2739fe0bbfff25dae` (v0.6 merged; bundle hashes verified; baseline `npm test` 109/109).

## Milestone 1 of 4 — Spellcasting charge → release (DONE in this package)

All 13 curated spells now cast through one pipeline, `src/rendering/casting.js`:

1. **Gather.** The caster turns to the target and plays its cast pose. Element-coloured motes converge on the casting point, a soft glow follows the body, and an element cue plays (fire, frost, dark, holy, nature, arcane, lightning).
2. **Intensify.** The glow brightens. Spells with a concentrated core get a spinning core ring, and lightning spells get small arcs around the body. Powerful spells (Lightning Bolt, Fireball) push the camera in about 5%, and armored creatures plant a small stomp ring.
3. **Release.** The spell's own effect leaves the caster's *current* casting point. That point is computed every frame from position, hover, bob, lunge, lift and body size.
4. **Impact.** The existing per-spell impact plays. The damage and healing numbers that follow are only played after the visual resolves at impact.

**Spell by spell:**
- **Shock:** an almost-instant spark.
- **Lightning Bolt:** a crackling core, then a body-flash discharge.
- **Flame Slash:** fire gathers at the arm, then a searing crescent.
- **Arc Lightning:** the first bolt fires from the caster, then hops between foes (unchanged).
- **Fireball:** the sphere now launches **from the caster**. The old sky meteor is gone.
- **Giant Growth:** energy rises from the ground into the body, then surges.
- **Drain Life:** a dark tether, then life flows back to the caster.
- **Infest:** spores are expelled, then a cloud spreads.
- **Raise the Alarm:** magic travels to the spot, and the circle forms as the Soldier appears.
- **Healing Hands:** golden beams converge, then a blessing spreads.
- **Healing Salve:** a quick pulse.
- **Feat of Resistance:** the ward expands outward from inside the body.
- **Frost Breath:** a stream of frost from the mouth, then a shatter.

**Casting follows the evolved body:**
- Horns, antlers or a crown channel non-hand spells through the head.
- Fliers rise slightly while charging.
- Larger and armored bodies cast from a higher origin with a stomp.

No new sprite art is needed.

**Settings:**
- *Instant* skips the charge entirely; the impact still lands.
- *Fast* scales the timing down.
- *Reduced motion* halves the timing and removes particles, shake and camera moves.

The battle UI wraps every cast in a 6-second safety timeout, and a thrown effect is caught, so a visual failure can never stall a turn.

**Rules and replay:** animation only. No rules, damage, mana, action counts or replay decisions changed. `RULES_VERSION` and the ranked challenge are unchanged.

**Dev gallery (`dev/vfx.html`):** buttons for all 13 spells, 5 creature forms (blank / small / winged / horned / armored), speeds ¼ / normal / fast / instant, reduced motion, and a "Charge stage only" button. It never touches saves, rewards or scores.

**Tests:** `tests/v07-casting.test.mjs` adds 19 tests, using a recording scene stub:
- every spell gathers at the caster and releases from the casting point
- impact happens before the cast resolves
- nothing falls from the sky
- self-cast spells fire no projectile
- fliers, horns and size move the origin
- instant and reduced motion work
- no lingering arcs; zoom is restored
- a thrown effect cannot stall the UI
- the pipeline imports no rules code

## Remaining milestones
2. Booster opening overhaul (presentation only; reward odds and contents unchanged).
3. Five new terrain features. These change the rules, so they'll need a new rules version and challenge revision, plus replay-equivalence tests.
4. Polish, audio and the pack gallery.
