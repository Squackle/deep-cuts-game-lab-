import { installReferenceSet } from '../src/cards/reference-set.js';
installReferenceSet();
import { loadAssets } from '../src/rendering/sprites.js';
import { deriveAppearance } from '../src/engine/appearance.js';
import { composeEquippedSheet } from '../src/rendering/equipment-visuals.js';
import { recolorSkin } from '../src/rendering/premium-creatures.js';
const $=id=>document.getElementById(id);const assets=await loadAssets();
const nameBoss={mtg_nemata:'Nemata',mtg_arasta:'Arasta',mtg_drakuseth:'Drakuseth',mtg_krenko:'Krenko',mtg_scarab:'The Scarab God',mtg_toxrill:'Toxrill',thornmother:'The Thornmother',matron:'The Pyre Matron',unwritten:'The Unwritten'};
function preview(src,w=64,f=0,view=0,anim=0){const c=document.createElement('canvas');c.width=144;c.height=144;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(src,f*w,(view*5+anim)*w,w,w,0,0,144,144);return c;}
function card(label,src,size){const d=document.createElement('div');d.className='card';d.append(preview(src,size));const title=document.createElement('strong');title.textContent=label;d.append(title);return d;}
for(const [k,label] of Object.entries(nameBoss))$('boss').append(card(label,assets.images[k],assets.manifest.sprites[k].w));
for(let shade=0;shade<12;shade++)$('skin').append(preview(recolorSkin(assets.images.blank,assets.images['blank:mask'],shade),64));
const models={blank:{parts:{},absorbed:[]},'dragon-cat':{parts:{wings:2,horns:1,tail:1,claws:1},absorbed:[{cardId:'mtg:volcanic-dragon'},{cardId:'mtg:savannah-lions'}]},'bird-tree':{parts:{wings:2,beak:1,moss:1,antlers:1},absorbed:[{cardId:'mtg:storm-crow'},{cardId:'mtg:eternal-witness'}]},armored:{parts:{wings:2,shell:1,spikes:2,armor:2},absorbed:[{cardId:'mtg:volcanic-dragon'}]},everything:{parts:Object.fromEntries(['wings','shell','spikes','horns','antlers','crown','tail','armor','blades','claws','tusks','beak','venom','moss','eyes','tendrils'].map(k=>[k,1])),absorbed:[{cardId:'mtg:volcanic-dragon'},{cardId:'mtg:savannah-lions'},{cardId:'mtg:storm-crow'},{cardId:'mtg:giant-scorpion'}]}};
function render(){const base=models[$('form').value];const evo={...base,colors:{},toughness:1,power:1};const app=deriveAppearance(evo,{skinTone:2});const eq=$('gear').value?[$('gear').value]:[];const au=$('aura').value?[$('aura').value]:[];const image=composeEquippedSheet(assets,app,eq,au);
 $('main').replaceChildren(card('Player · Idle Front',image,64),card('Player · Attack Front',image,64),card('Player · Idle Back',image,64));$('main').children[1].querySelector('canvas').replaceWith(preview(image,64,2,0,2));$('main').children[2].querySelector('canvas').replaceWith(preview(image,64,1,1,0));
 $('main').append(card('Soldier · Idle',assets.images.mtg_friendlySoldier,64));}
for(const key of ['form','gear','aura'])$(key).addEventListener('change',render);
render();
