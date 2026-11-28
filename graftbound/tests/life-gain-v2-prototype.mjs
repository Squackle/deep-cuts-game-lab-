// Test-only prototype for proposed revision 31; NOT imported by runtime/verifier.
// A single authoritative healing operation emits one event, including capped HP.
// The event is consumed exactly once, even after serialization/recovery.
import { player } from '../src/engine/combat.js';
import { resolveComboEvents } from '../src/engine/combo-triggers.js';
export const VERSION='life-gain-v2-candidate-1';
export function candidateGain(s, amount, source, recipient=player(s)) {
 if(!Number.isSafeInteger(amount)||amount<=0||!recipient||recipient.hp<=0||
    s.victoryDeclared||['won','lost'].includes(s.phase))return null;
 const restored=Math.min(amount,Math.max(0,recipient.maxHp-recipient.hp));
 recipient.hp+=restored;
 // Ally self-healing remains distinct from hero life gain in this tactical model.
 if(!recipient.hero)return null;
 const ledger=s.lifeGainCandidate||={next:0,consumed:0};
 return {t:'lifeGainV2',seq:++ledger.next,uid:recipient.uid,nominal:amount,restored,source};
}
export function consumeCandidateGain(s,event) {
 if(!event||event.t!=='lifeGainV2'||!Number.isSafeInteger(event.seq)||event.uid!==player(s)?.uid||
    !Number.isSafeInteger(event.nominal)||event.nominal<=0||!Number.isSafeInteger(event.restored)||
    event.restored<0||event.restored>event.nominal||s.victoryDeclared||['won','lost'].includes(s.phase)||player(s).hp<=0)return [];
 const ledger=s.lifeGainCandidate;
 if(!ledger||event.seq!==ledger.consumed+1||event.seq>ledger.next)return [];
 ledger.consumed=event.seq;
 // Exercise the existing Pridemate trigger path, not an imitation of its counter logic.
 return resolveComboEvents(s,[{t:'comboLifeGain',uid:event.uid,amount:event.nominal,kind:event.source}]);
}
