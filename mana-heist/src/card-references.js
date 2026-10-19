// Real Magic card REFERENCE gallery: not playable game components.
// Images are served via Scryfall's image redirect, retaining complete card frames,
// artist credits and copyright notices. The heist uses original playable artwork.
const names=Object.freeze({
 plains:"Plains",island:"Island",swamp:"Swamp",mountain:"Mountain",forest:"Forest",
 dualUR:"Volcanic Island",dualWU:"Tundra",dualUG:"Tropical Island",dualWB:"Scrubland",dualBR:"Badlands",
 shockUR:"Steam Vents",shockBG:"Overgrown Tomb",shockBR:"Blood Crypt",shockWU:"Hallowed Fountain",
 painUR:"Shivan Reef",painUB:"Underground River",painBG:"Llanowar Wastes",
 checkUB:"Drowned Catacomb",checkUR:"Sulfur Falls",checkWG:"Sunpetal Grove",
 fetchUR:"Scalding Tarn",fetchBG:"Verdant Catacombs",
 bounceUG:"Simic Growth Chamber",relic:"Wastes",
 signet:"Azorius Signet",bluffs:"Cascade Bluffs",solring:"Sol Ring",coffers:"Cabal Coffers",urborg:"Urborg, Tomb of Yawgmoth",
 nykthos:"Nykthos, Shrine to Nyx",lotus:"Lotus Field",ziggurat:"Ancient Ziggurat",treasure:"Treasure",petal:"Lotus Petal",confluence:"Mana Confluence",command:"Command Tower",ritual:"Dark Ritual",pyretic:"Pyretic Ritual",desperate:"Desperate Ritual",song:"Seething Song",rite:"Rite of Flame",geyser:"Mana Geyser",tide:"High Tide",
 fellwar:"Fellwar Stone",talisman:"Talisman of Dominance",mindstone:"Mind Stone",vessel:"Thought Vessel",archive:"Hedron Archive",thran:"Thran Dynamo",worn:"Worn Powerstone",gilded:"Gilded Lotus",arcane:"Arcane Signet",prism:"Prismatic Lens",cylix:"Mana Cylix",lantern:"Chromatic Lantern",skyclave:"Skyclave Relic",basalt:"Basalt Monolith",key:"Voltaic Key",bloom:"Lotus Bloom",nyxlotus:"Nyx Lotus",chalice:"Everflowing Chalice"
});
export function referenceFor(cardKey){
 const name=names[cardKey];
 if(!name)return null;
 return {
  name,
  page:"https://scryfall.com/search?q="+encodeURIComponent('!"'+name+'"'),
  image:"https://api.scryfall.com/cards/named?exact="+encodeURIComponent(name)+"&format=image&version=normal"
 };
}
export function referenceCards(level){
 const keys=[...level.field,...level.hand,...level.library].map(c=>c.card);
 return [...new Set(keys)].map(referenceFor).filter(Boolean).slice(0,7);
}
export function renderCardReferences(node,level){
 const entries=referenceCards(level);
 node.replaceChildren();
 for(const item of entries){
  const link=document.createElement("a");
  link.href=item.page;link.target="_blank";link.rel="noopener noreferrer";
  link.className="reference-card";
  const img=document.createElement("img");
  img.src=item.image;img.alt="Official full Magic: The Gathering card: "+item.name;img.width=146;img.height=204;
  img.loading="lazy";img.decoding="async";
  img.addEventListener("error",()=>{img.hidden=true;link.classList.add("image-missing")},{once:true});
  const name=document.createElement("span");name.textContent=item.name+" ↗";
  link.append(img,name);node.append(link);
 }
}
