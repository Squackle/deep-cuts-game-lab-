// Inline SVG icons (original). currentColor-based.
const svg = (body, vb = '0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true" class="ic">${body}</svg>`;
export const ICON = {
  sword: svg('<path d="M14.5 3h6v6l-9 9-3-3z" fill="currentColor"/><path d="M4 16l4 4M3 21l3-3M7 13l4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'),
  aim: svg('<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="2"/>'),
  slam: svg('<path d="M12 2l2.5 6.5L21 9l-5 4.2L17.5 21 12 17l-5.5 4 1.5-7.8L3 9l6.5-.5z" fill="currentColor"/>'),
  summon: svg('<path d="M12 3c3 4 6 6 6 10a6 6 0 01-12 0c0-4 3-6 6-10z" fill="currentColor"/><path d="M12 10v7M8.5 13.5h7" stroke="#0d1a14" stroke-width="2"/>'),
  shield: svg('<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="currentColor"/>'),
  poison: svg('<path d="M12 2c3 5 6 8 6 12a6 6 0 01-12 0c0-4 3-7 6-12z" fill="currentColor"/><circle cx="10" cy="14" r="1.6" fill="#0d1a14"/><circle cx="14" cy="16" r="1.2" fill="#0d1a14"/>'),
  stun: svg('<path d="M4 12a8 8 0 0116 0" stroke="currentColor" stroke-width="2" fill="none"/><path d="M9 8l1.5 2.5L13 9l-.8 2.8L15 13" stroke="currentColor" stroke-width="2" fill="none"/>'),
  spit: svg('<circle cx="7" cy="12" r="3" fill="currentColor"/><circle cx="14" cy="10" r="2" fill="currentColor"/><circle cx="19" cy="8" r="1.4" fill="currentColor"/>'),
  move: svg('<path d="M4 12h12M12 6l6 6-6 6" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>'),
  guard: svg('<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="2" fill="none"/>'),
  heart: svg('<path d="M12 21s-8-5-8-11a4.5 4.5 0 018-3 4.5 4.5 0 018 3c0 6-8 11-8 11z" fill="currentColor"/>'),
  gem: svg('<path d="M12 2l7 7-7 13L5 9z" fill="currentColor"/><path d="M5 9h14M12 2v20" stroke="rgba(0,0,0,.25)" stroke-width="1"/>'),
  book: svg('<path d="M4 4h7v16H4zM13 4h7v16h-7z" fill="none" stroke="currentColor" stroke-width="2"/>'),
  sound: svg('<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8c2 2 2 6 0 8" stroke="currentColor" stroke-width="2" fill="none"/>'),
  mute: svg('<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  rotL: svg('<path d="M7 7a7 7 0 11-2 5" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M3 4v5h5" stroke="currentColor" stroke-width="2.2" fill="none"/>'),
  rotR: svg('<path d="M17 7a7 7 0 102 5" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M21 4v5h-5" stroke="currentColor" stroke-width="2.2" fill="none"/>'),
  /** GRAFTBOUND sigil: a card-shaped seal bound by a thorned vine (original mark). */
  sigil: svg('<path d="M7 3h10l2 2v14l-2 2H7l-2-2V5z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12 6v12M8.5 9.5c2 0 3.5 1 3.5 2.5s1.5 2.5 3.5 2.5M15.5 9.5c-2 0-3.5 1-3.5 2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M9 6.5l-1-1M15 6.5l1-1M9 17.5l-1 1M15 17.5l1 1" stroke="currentColor" stroke-width="1.2"/>'),
};
