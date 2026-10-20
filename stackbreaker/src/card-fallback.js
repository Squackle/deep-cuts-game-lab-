// Display-only fallback: rules and payments still come from engine.js.
const escapeCardText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderCardFallback(name,card={},className='',oracle=''){
 const cost=Object.entries(card.cost||{}).map(([c,n])=>c==='generic'?String(n):c.repeat(n)).join(' ');
 const stats=Number.isFinite(card.power)&&Number.isFinite(card.toughness)?`<b>${card.power}/${card.toughness}</b>`:'';
 return `<span class="image-pending card-fallback ${escapeCardText(className)}" data-preview="${escapeCardText(name)}"><strong>${escapeCardText(name)}</strong><small>${escapeCardText(cost||card.type||'')}</small><span class="fallback-rules">${escapeCardText(oracle||card.oracle||'')}</span>${stats}</span>`;
}
