// Combat-only Channel reserve. No wall clock, RNG, DOM, or changes across encounters.
export const CHANNEL_MANA_CAP = 2, CHANNEL_CHARGE_CAP = 2;
export const availableMana = s => (s.p.mana || 0) + (s.p.storedMana || 0) + (s.combo?.treasure || 0);
export function spendMana(s, amount) {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > availableMana(s)) throw new Error('Not enough mana');
  const before = availableMana(s);
  const normal = Math.min(s.p.mana, amount);
  s.p.mana -= normal;
  const bank=Math.min(s.p.storedMana || 0,amount-normal);
  s.p.storedMana=Math.max(0,(s.p.storedMana||0)-bank);
  if(s.combo)s.combo.treasure=Math.max(0,(s.combo.treasure||0)-(amount-normal-bank));
  return { t:'mana', from:before, to:availableMana(s), reserve:s.p.storedMana,treasure:s.combo?.treasure||0 };
}
export function addChannel(s, mana=1, charge=1) {
  const before=availableMana(s);
  s.p.storedMana=Math.min(CHANNEL_MANA_CAP,(s.p.storedMana||0)+mana);
  s.p.channel=Math.min(CHANNEL_CHARGE_CAP,(s.p.channel||0)+charge);
  s.p.channeledTurn=s.turn;
  return {t:'mana',from:before,to:availableMana(s),reserve:s.p.storedMana,charge:s.p.channel};
}
