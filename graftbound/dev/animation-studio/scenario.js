// Animation studio fixture only. The live GRAFTBOUND combat engine and saves are untouched.
export const DAMAGE = 2;
export const SCENARIO = Object.freeze([
  { uid: 1, name: 'The Blank · caster', side: 'player', x: 2, y: 5, hp: 5, maxHp: 5, sprite: 'blank' },
  { uid: 2, name: 'Companion', side: 'player', x: 1, y: 3, hp: 1, maxHp: 1, sprite: 'hound' },
  { uid: 3, name: 'Guardian', side: 'player', x: 4, y: 6, hp: 4, maxHp: 4, sprite: 'warden' },
  { uid: 4, name: 'Skitter', side: 'enemy', x: 7, y: 1, hp: 1, maxHp: 1, sprite: 'grub' },
  { uid: 5, name: 'Ash Hound', side: 'enemy', x: 7, y: 4, hp: 2, maxHp: 2, sprite: 'hound' },
  { uid: 6, name: 'Brute', side: 'enemy', x: 5, y: 2, hp: 4, maxHp: 4, sprite: 'warden' },
  { uid: 7, name: 'Hexer', side: 'enemy', x: 4, y: 0, hp: 3, maxHp: 3, sprite: 'hexer' }
]);
export function resolveBoardFire(units, amount = DAMAGE) {
  if (!Number.isInteger(amount) || amount < 0) throw new RangeError('Damage must be a nonnegative integer');
  return units.map(u => {
    const hp = Math.max(0, u.hp - amount);
    return { ...u, hp, dead: hp === 0 };
  });
}
export const PHASES = Object.freeze([
  { time: 0, label: 'THE INVOCATION' },
  { time: 0.62, label: 'THE ASCENT' },
  { time: 1.37, label: 'THE VORTEX' },
  { time: 2.56, label: 'THE DEVASTATION' },
  { time: 3.62, label: 'ASHFALL' }
]);
export const IMPACT_TIME = 3.16;
export const DURATION = 5.2;
