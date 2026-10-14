/** Disabled on the standalone test site. The main site's score service is separate. */
const response=()=>new Response(JSON.stringify({error:"Solo Game Lab. Public rankings and submissions are disabled.",
 publicGame:"https://deep-cuts-edh.pages.dev/games/hive-run/"}),{status:410,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
export function onRequestGet(){return response()}
export function onRequestPost(){return response()}
