# GRAFTBOUND v1.5.3 — Honest Global Threat map display

The new adaptive encounter rule introduced two distinct numbers:

1. **Stored Threat** is the campaign's saved persistent level (0–12). It grows after clean wins or repeated low-damage wins, and eases after heavy enemy damage.
2. **Applied Battle Threat** is the larger of saved threat and the current hero's effective-strength floor, recalculated at each reachable battle depth. A strong player may face level 8 with a stored level of 0.

Previously the map mini-plate displayed only the first number and might misleadingly say `World Threat 0/12 · Dormant` while the next fight already applied level 8. The battle banner showed the higher level after entering combat.

The map now displays `⚔ World Threat · Stored X/12 · Next battle Y/12` using `previewNextWorldThreat` to compute actual reachable battle depths from the same `strengthOf`, `expectedStrength`, `stepOf`, and `effectiveThreatLevel` used to create the encounter. If two reachable combats have differing pressure, the display shows the accurate minimum–maximum range. If only shrines/events are reachable, the label says the next battle will adapt to the current build, without fabricating a value.

The forecast function is pure and **does not mutate saves, RNG, progression or combat rules**. `run.worldThreat.level` remains the stored value; only the HUD presentation changes. The underlying adaptive encounter algorithm and ranked challenge revision 20 are unchanged.

Regression tests compare a strong hero's map forecast directly to the actual created battle, ensure weak heroes remain pressure 0, handle old saves without a threat record and verify accessible HUD wording. Game Lab source suite, shared Lab tests, protected release coordination and exact Cloudflare production verification are mandatory.

**Not a gameplay rebalance:** This fixes transparent disclosure of a previously shipped battle difficulty rule, not its mathematical implementation. Further balance playtesting is still important, and complete premium HD-2D artistic acceptance remains open.

Scope: only `graftbound/**`. No public website, sibling game, save keys, card rules, rankings, backend, D1 or payments. Revert the isolated visual-display PR to roll back.
