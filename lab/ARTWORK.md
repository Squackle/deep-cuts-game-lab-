# Shared Game Lab cover art

The four illustrations in `lab/covers/` are original, first-party SVG artworks showing each game's mechanics in the Lab's dark-fantasy aesthetic. None embeds, fetches, hotlinks or reproduces official Magic: The Gathering card images or Scryfall artwork.

- **Hive Run** — an armored evolving brood-creature above glowing eggs in a cavern.
- **Stackbreaker** — a spellcaster, floating cards and blue-violet spell energy.
- **Mana Heist** — a five-seal magical vault, representing mana and puzzle choices.
- **GRAFTBOUND** — The Blank evolving into an armored winged grafted creature over an isometric tactical floor, with three campaign-realm motifs, reward cards and an enemy. This is *illustrative cover art*, not a gameplay screenshot.

The illustrations use 960×540 SVG view boxes, local assets, accessible alt text and no runtime script. Game Lab card copy describes the currently released **GRAFTBOUND v1.3.9-beta**: a three-act tactical grafting RPG with adapted Magic card rewards, creature and spell grafts, route choices and rising Global Threat. The separate v1.4.0-beta branch is preview-only and is not advertised as deployed.

The Lab catalog links to four independent playable routes. Guest progress stays game-specific, and no Game Lab release automatically promotes a game to the production Deep Cuts EDH Arcade.

## Catalog URL and route preservation

The canonical Lab homepage is now `/`, with the prior `/lab/` catalog retained for incoming links. Both catalog pages use the same text and four cover illustrations; only their local asset references differ. Hive Run moved its entry document to `/hive-run/`, while its original art and gameplay modules remain at their old paths. The catalog's automated tests verify both entry pages stay synchronized.
