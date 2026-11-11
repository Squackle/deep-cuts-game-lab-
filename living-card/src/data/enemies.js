// Enemy definitions. Enemies use the same keyword engine as the player. Health = toughness.
// role: the tactical identity shown to the player.
export const ENEMIES = {
  grub:     { name: 'Mire Grub',        role: 'Brute',      power: 1, toughness: 1, move: 2, ai: 'melee',      sprite: 'grub',     blurb: 'Slow. Bites anything adjacent.' },
  hound:    { name: 'Bramble Hound',    role: 'Skirmisher', power: 2, toughness: 2, move: 3, ai: 'flanker',    sprite: 'hound',    pack: true, blurb: 'Pack hunter: +1 power when another foe is beside its target. Prefers the side opposite its packmates.' },
  archer:   { name: 'Thornbow Sentry',  role: 'Caster',     power: 1, toughness: 2, move: 2, ai: 'archer',     sprite: 'archer',   aimDamage: 3, aimRange: 6, blurb: 'Aims along a line, fires next turn. Step out of the red.' },
  tortoise: { name: 'Cairnback Warden', role: 'Guardian',   power: 1, toughness: 5, move: 1, ai: 'guardian',   sprite: 'warden',   guard: 2, blurb: 'Shields adjacent allies each turn.' },
  moth:     { name: 'Hexwing Moth',     role: 'Caster',     power: 1, toughness: 1, move: 3, ai: 'skirmisher', sprite: 'moth',     keywords: { flying: 1 }, poison: 2, spitRange: 3, blurb: 'Flies. Spits poison from range 3.' },
  hexer:    { name: 'Briar Hexer',      role: 'Caster',     power: 1, toughness: 3, move: 2, ai: 'hexer',      sprite: 'hexer',    hexRange: 4, weaken: 2, blurb: 'Curses from range 4: deals 1 and Weakens you (−2 power during your next turn). Keeps its distance.' },
  alpha:    { name: 'Gloamfang Alpha',  role: 'Assassin',   power: 3, toughness: 4, move: 3, ai: 'melee',      sprite: 'alpha',    keywords: { firstStrike: 1 }, elite: true, blurb: 'Mini-boss. First Strike — strikes before you in melee.' },
  thornmother: { name: 'The Thornmother', role: 'Summoner', power: 3, toughness: 16, move: 1, ai: 'thornmother', sprite: 'thornmother', legendary: true, boss: true, keywords: { spines: 2 },
    slamDamage: 4, strikeCap: 5, blurb: 'Legendary. Ancient Heartwood: no single strike deals her more than 5. Thorned hide (Spines 2). Telegraphs Root Slams (a quarter of your max health — step out of the red), calls hounds, grows bark when wounded. Weakness: many strikes (Double Strike, allies), spells and ranged attacks.' },
};
