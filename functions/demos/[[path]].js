/**
 * Retired Game Lab demo paths.
 * Cloudflare Pages' stale edge-cached demo assets can outlive a GitHub file
 * deletion. This explicit Function route returns Gone with no demo content.
 * It does not touch the arcade, score API or leaderboard.
 */
const gone=()=>new Response("This demonstration is no longer available.",{
 status:410,
 headers:{
  "Content-Type":"text/plain; charset=utf-8",
  "Cache-Control":"no-store, max-age=0",
  "X-Content-Type-Options":"nosniff"
 }
});
export const onRequest=()=>gone();
