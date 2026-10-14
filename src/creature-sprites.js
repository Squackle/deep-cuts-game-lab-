/**
 * HIVE RUN creature art, extracted and palette-reduced from the approved
 * WUBRG concept sheet (saved in Deep Cuts Game Lab Library).
 * 45 body tiles (9 each W/U/B/R/G), one point-headed arm-bearing
 * head and one double-pronged tail. Zlib-compressed indexed pixels.
 * No third-party image hosting or runtime network dependency.
 */
export const WUBRG = ["W","U","B","R","G"];
// Cycle W/U/B/R/G visibly, while visiting each of the 45 distinct sprites.
export function variantForSegment(index){
 const n=Math.max(0,Math.floor(index));
 return (n%5)*9+(Math.floor(n/5)%9);
}
const PIXELS = "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";
export async function loadCreatureArtData(){
 if(typeof DecompressionStream!=="function")return null;
 try{
  const bytes=Uint8Array.from(atob(PIXELS),c=>c.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  const source=JSON.parse(await new Response(stream).text());
  if(source.body?.length!==5||source.body.some(row=>row.tiles?.length!==9))throw Error("Bad creature atlas");
  return source;
 }catch(error){console.warn("Creature sprite art unavailable, using fallback",error);return null}
}
export async function loadCreatureArt(){
 const source=await loadCreatureArtData();
 if(!source||typeof document==="undefined")return null;
 try{
  const build=(pattern,palette,width,height)=>{
   const tile=document.createElement("canvas");tile.width=width;tile.height=height;
   const ctx=tile.getContext("2d");const pixels=ctx.createImageData(width,height);
   if(pattern.length!==width*height)throw Error("Bad creature tile dimensions");
   for(let i=0;i<pattern.length;i++){
    const ch=pattern[i];if(ch===".")continue;
    const rgb=palette[parseInt(ch,16)];if(!rgb)continue;
    const value=parseInt(rgb.slice(1),16),offset=i*4;
    pixels.data[offset]=(value>>16)&255;
    pixels.data[offset+1]=(value>>8)&255;
    pixels.data[offset+2]=value&255;
    pixels.data[offset+3]=255;
   }
   ctx.putImageData(pixels,0,0);return tile;
  };
  return {
   body:source.body.flatMap(row=>row.tiles.map(tile=>build(tile,row.colors,20,20))),
   head:build(source.parts.tiles[0],source.parts.colors,28,36),
   tail:build(source.parts.tiles[1],source.parts.colors,28,36)
  };
 }catch(error){console.warn("Creature sprite art unavailable, using fallback",error);return null}
}
