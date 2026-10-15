// Original vector fantasy landscapes, generated from our own palette and primitives.
// No Magic card images, mana symbols, or third-party artwork.
const palettes={
 basic:["#193743","#577f83","#e5c48b"],dual:["#27344b","#64859a","#c99c74"],
 shock:["#182f48","#94524c","#f4c07a"],pain:["#312b43","#896681","#df9d84"],
 check:["#1e3b47","#697f72","#b5b999"],fetch:["#244450","#668d84","#e0b487"],
 bounce:["#214d61","#63868c","#e6bc93"],utility:["#394349","#7f8688","#d8c5a0"]
};
function numericHash(str){let n=5381;for(const c of str)n=(n*33)^c.charCodeAt(0);return n>>>0;}
export function landPainting(card){
 const [dark,mid,light]=palettes[card.kind]||palettes.basic;
 const seed=numericHash(card.name);
 const mountain=card.types?.includes("Mountain")||card.kind==="shock";
 const water=card.types?.includes("Island")||card.kind==="bounce"||card.kind==="fetch";
 const forest=card.types?.includes("Forest")||card.kind==="check";
 const night=card.types?.includes("Swamp")||card.kind==="pain";
 const sunX=66+(seed%150),sunY=30+(seed%45);
 const peaks=mountain
  ? '<path d="M0 140L44 91 76 119 139 61 184 125 219 79 290 150V205H0Z" fill="'+dark+'" stroke="'+light+'" stroke-opacity=".45" stroke-width="2"/><path d="M105 98L139 61 167 103 141 89 126 96Z" fill="'+light+'" opacity=".6"/>'
  : '<path d="M0 146Q40 117 87 131T190 118T290 145V205H0Z" fill="'+dark+'" opacity=".83"/>';
 const streams=water?
  '<path d="M0 162Q74 139 131 160T290 145V205H0Z" fill="'+mid+'" opacity=".8"/><path d="M-20 181Q69 156 128 178T304 172M-10 194Q67 169 153 190T304 183" fill="none" stroke="'+light+'" stroke-width="2.2" opacity=".75"/>'
  : '<path d="M-10 175Q65 144 123 174T300 166V205H0Z" fill="'+mid+'" opacity=".64"/>';
 const trunks=forest||night?
  Array.from({length:6},(_,i)=>{const x=14+i*52+((seed+i*9)%19);return '<path d="M'+x+' 184V'+(86+i%3*12)+'m0 26l-14-22m14 7l20-29" stroke="'+dark+'" stroke-width="'+(7+i%3*2)+'" stroke-linecap="round" fill="none"/><path d="M'+x+' '+(92+i%3*12)+'l-17 30 16-8 19 8Z" fill="'+mid+'" opacity=".9"/>';}).join("")
  : '';
 const spires=card.kind==="check"||card.kind==="dual"
  ? '<path d="M199 158V84l14-18 14 18v74M213 65V39M193 111h39M205 105v-15" stroke="'+light+'" stroke-width="5" fill="none" opacity=".75"/>' : '';
 const bolt=card.kind==="shock"?'<path d="M202 2L157 80 191 75 153 144 241 56 203 65Z" fill="'+light+'" opacity=".9"/>':'';
 const orbs=Array.from({length:8},(_,i)=>{
  const x=(seed*(i+7)%290),y=(seed*(i+13)%155);
  return '<circle cx="'+x+'" cy="'+y+'" r="'+(i%3+1)+'" fill="'+light+'" opacity=".42"/>';
 }).join("");
 const safe=(seed%10000000).toString(36);
 return '<svg class="art-painting" viewBox="0 0 290 205" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+
  '<defs><linearGradient id="sky-'+safe+'" x1="0" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="'+dark+'"/><stop offset=".62" stop-color="'+mid+'"/><stop offset="1" stop-color="'+light+'"/></linearGradient>'+
  '<radialGradient id="glow-'+safe+'"><stop offset="0" stop-color="'+light+'" stop-opacity=".85"/><stop offset="1" stop-color="'+light+'" stop-opacity="0"/></radialGradient></defs>'+
  '<rect width="290" height="205" fill="url(#sky-'+safe+')"/><circle cx="'+sunX+'" cy="'+sunY+'" r="'+(night?24:31)+'" fill="url(#glow-'+safe+')"/><circle cx="'+sunX+'" cy="'+sunY+'" r="12" fill="'+light+'" opacity=".9"/>'+
  '<path d="M0 146Q60 120 108 136T213 127T290 139" fill="none" stroke="'+light+'" stroke-opacity=".22" stroke-width="20"/>'+
  peaks+streams+trunks+spires+bolt+orbs+
  '<rect x="4" y="4" width="282" height="197" rx="2" fill="none" stroke="'+light+'" stroke-opacity=".28" stroke-width="5"/></svg>';
}
