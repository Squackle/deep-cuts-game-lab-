// Single source of truth for battlefield hazard/benefit numbers (v0.6). Rules, AI, tooltips and path warnings
// all read these values, so a balance change can never leave a tooltip describing an old number.
export const TERRAIN_RULES = {
  bramble: { enterDamage: 1 },
  lava: { enterDamage: 2, endTurnDamage: 2 },
  rift: { pulseDamage: 3, pulseEvery: 2 },
  leyline: { manaBonus: 1 },
  crystal: { manaGain: 2, dischargeDamage: 2, dischargeRadius: 1 },
  frost: { coolRounds: 2 },
  ice: { slowNextMovement: 1 },       // crossing ice chills walkers (ground only), for their next action
  spores: { poisonOnEnter: 1 },       // poisonous mushroom field; fire clears it
  unstable: { pulseDamage: 2, every: 2 }, // telegraphed stone fissures, no permanent softlock
  conduit: { spellBonus: 1 },        // standing here at turn start empowers one spell this turn
  crumble: { enterDamage: 1 },      // one-shot falling stone, becomes ordinary floor after entry
};
