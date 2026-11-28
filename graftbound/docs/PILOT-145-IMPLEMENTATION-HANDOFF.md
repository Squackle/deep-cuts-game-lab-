# GRAFTBOUND expansion pilot engineering handoff (2026-11-24)

Status: implementation preparation only. Sources: Lab issues [#204](https://github.com/Squackle/deep-cuts-game-lab-/issues/204), [#205](https://github.com/Squackle/deep-cuts-game-lab-/issues/205) and website [#140](https://github.com/Squackle/deep-cuts-edh/pull/140). The owner approved five pilot mechanic decisions, not the full 67-card roster, popup visual design, booster rules, or release. This document does not change the live pool.

## Baseline and constraints

- 133 real cards (102 creatures, 21 spells, 10 attachments); the pilot alone would make 145. Remaining proposal: 55 additional cards. Preserve six encounter-only boss identities, existing legacy IDs and saves, rarity gates and no-rares challenges.
- Current rules graftbound-rules-1.8.3-beta, pool real-pool-133-v7, scoring gb-score-2, ranked challenge gb-expedition-01 revision 30. Website #140 pins Lab SHA 367c15af26231b0ea707bd5d3e4ca75d78f32bfa with its own verifier digest. Do not re-pin, enable launch, alter production D1 or migrate historical scores here.
- Printed identity verification gate: use Wizards' current [Comprehensive Rules](https://magic.wizards.com/en/rules) and [Gatherer](https://gatherer.wizards.com/) for each exact Oracle entry; November 6, 2026 [Star Trek update bulletin](https://www.magic.wizards.com/en/news/announcements/star-trek-update-bulletin) is a current rules-update reference. Individual Gatherer records and complete official rule-number audit were not retrievable in this pass; no claim of verified Oracle facts or Forge parity. Validate those before implementing.
- Tactical effects below are requirements derived from the project issues, not a claim that GRAFTBOUND implements the complete Magic rules. Explicitly disclose tactical adaptations and record printed cost separately from tactical mana budget. Final rarity/level balance and new art require review.

## Pilot implementation map

| Candidate | Existing source seam | Required behavior / missing work | Minimum acceptance |
|---|---|---|---|
| Essence Warden | combo-triggers.js summon / Soul Warden | Reuse both-side creature-entry event, separate trait identity; positive life gain only | Friendly/enemy enter; blocked spawn produces no gain; both Wardens stack independently |
| Bloodthirsty Aerialist | comboLifeGain / Ajani's Pridemate | Separate +1/+1 counter effect per actual life-gain event | Multiple gains, full-health behavior, counters and save parity; no duplicate stamp |
| Marauding Blight-Priest | abilities.js loseLife, trait-triggers.js nearest foe | Fixed 1 life-loss per actual gain, stable tie break; no damage/shield confusion | Lifegain chains, nearest ties, no foe, terminal state |
| Kessig Flamebreather | combat.js cast, comboSpellCast | Existing hook is instant/sorcery only; add separate noncreature-cast event including Aura, excluding equip activation, preserving older triggers | One ping per accepted spell, not equip/discard/cancel; nearest stable tie |
| Welcoming Vampire | summon / Mentor of the Meek, phase key in combo state | Automatic draw for allied small other creature once per phase; persistent turn/phase marker; separate source from Mentor | Two qualifying arrivals same phase, both phases, too-large foe, save/replay |
| Verdant Force | turn events / comboToken | Add green 1/1 Saproling token spec, one spawn at each player and enemy phase start, no arbitrary population cap | Opening once, full board skip, next phase freed tile, 20+ tokens, no post-terminal spawn |
| Harmonize | spells.js page_draw, traitDraw | Separate draw-three effect or data-driven count; validate actual remaining cards and refill behavior rather than invent cards | Draw 3, partial/empty zones, draw triggers, discard limit and replay |
| Village Rites | abilities.js sacrificeAlly, comboActivate Ayara, traitDraw | Select legal nonhero ally, sacrifice as committed cost, draw two; validate cost/target before mutation | Invalid/cancel unchanged; death and draw FIFO; Skullclamp and Zulaport interactions |
| Sleep | spells.js rootsnare, AI stunned action | Ordinary foes skip next action; each boss susceptible once per encounter, then LEGENDARY RESISTANCE; no newly spawned target | Multiple casts, multiple bosses, save mid-stun, no repeated boss lock |
| Opt | deck.js, comboChoices, resolveComboChoice, ranked.js | Serializable mandatory Scry 1 with actual top card, keep or bottom, then draw; exact timing/empty/refill policy | Both choices, one-card library, empty zone, no phantom draw; resume and segment parity |
| Skullclamp | attachments.js modifiers, abilities.js checkStateBasedDeath/death | Equip 1, +1/-1, draw two once on attached creature death incl. sacrifice/SBA; preserve gear, hero lethal confirmation | 1/1 dies immediately, draw once, detach/reattach, partial draw, hero warning cancel unchanged |
| Shadowspear | attachments.js keyword rebuild, comboActiveOptions, mana.js | Passive +1/+1 trample lifelink, equip 2; paid 1 ability while on battlefield even unequipped; suppress existing enemies' hexproof/indestructible until player turn ends | Unequipped ownership, repeated activation, new spawns, restoration/overlap, boss immunity separately unchanged |

## Implementation sequence and version safeguards

1. Write fail-first tests for each row, plus four build archetypes: tokens/sacrifice, life gain, spells matter, and large creatures. Add explicit stable phase markers and event ordering before reward registration. Audit actual life gain semantics in abilities.js and combo-triggers.js; do not assume comboLifeGain currently covers every heal path.
2. Implement low-dependency triggers, then token phase events and exact draw/sacrifice interactions. Existing traitDraw refills only before its batch; agree on draw-across-empty semantics before changing existing card behavior. Keep old cards' effects and original action counters unchanged unless separately versioned.
3. Implement Sleep with per-boss persistent flag, then Opt choice with stable action payload and checkpoint/save coverage. For Village Rites ensure target and payment checked before sacrifice; use existing authoritative death pipeline, not visual events.
4. Implement Skullclamp and Shadowspear as actual equipment state, including state-based death and source-specific keyword suppression. Do not delete permanent keyword sources, grant new boss vulnerabilities, or create post-terminal effects.
5. UX signoff from #205: card-first dialogs (not ornate or radial design), locked unresolved choices, actionable choices only, costs/disabled reasons, before/after P/T for equip; explicit lethal hero confirmation; one visible genuine Scry card with Keep / Bottom; top-right Abilities with separate Graft Powers / Equipment Abilities and 44px hit target, original subtle animated sigil/static reduced-motion. No remembered trigger answers in this pilot without approval.
6. Confirm original sprites and graft attachment anchors, Saproling identity/art and swarm stress. Existing friendly sproutling/plant model is a candidate, not confirmed identical Saproling art. No borrowed card art as unit textures.
7. Only after approval register cards in curated pool, update compatibility and facts; bump card pool/rules/challenge revision together, retain old verifier/records separately and archive older local ranked saves rather than submit under new rules. Run current and historical replay fixtures, no-rares reward gates, boss exclusions, full integration manifest, desktop/mobile browser QA and signed-off preview. Website re-pin is separate work.

## Full roster triage

The remaining 55 names in #204 are not approved. Likely reuse categories: direct draw, stat buffs, existing keywords, damage, token creation and existing entry/death/cast event hooks. Higher-risk candidates explicitly identified by #204: Sun Titan (recursion), Hullbreaker Horror (bounce), Chaos Warp (random replacement), Aether Channeler (multimode), Birgi and Delver (face changes), Myr Battlesphere (swarm/identity), Teysa and Chatterfang (trigger multiplication). Do not assume these are supported because a superficially similar effect exists. Leave final 40/20/7 roster and 4/5-card offers (choose one) to owner signoff; do not modify reward generation.

## Maintenance checklist

For each new entry document exact Oracle source, printing/rarity, mana cost, tactical cost/target, trait and timing, visual anatomy and token art, known differences, reward eligibility, save/replay fixture and tests. Run npm test, npm run integration:manifest, and the existing network fact audit tools/verify-real-pool.mjs. Keep rendering and UI out of the verifier. For art, validate frame dimensions, view count, animation rows, opaque bounds and contact anchors through existing HD2D manifest tests and inspect front/back/side and attack poses on desktop and mobile. Keep generated sprite files original and only replace affected assets.

Open decisions: popup wireframe/visual direction; final pilot card fact/cost/rarity and level budget; precise refill/empty-zone and terminal trigger boundaries where not specified; broader roster and packs; launch and website pin. No feature release authorized by this document.
