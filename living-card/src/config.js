// GRAFTBOUND feature flags. "Real cards" mode (real Magic: The Gathering card data from a curated,
// rules-checked pool) is ON and the default content mode. Images and Oracle text are fetched read-only
// from Scryfall at runtime and shown unmodified with attribution; never turned into sprites.
// Set REFERENCE_MODE_AVAILABLE=false to ship the original set only.
export const GAME = { title: 'GRAFTBOUND', tagline: 'Begin as nothing. Become everything.', version: '0.4.0' };
export const CONFIG = {
  REFERENCE_MODE_AVAILABLE: true,
  SHOW_REFERENCE_IMAGES: true,
  LIVE_SCRYFALL: true,
  SCRYFALL_API: 'https://api.scryfall.com',
};
