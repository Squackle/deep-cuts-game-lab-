/** Copy portable release files into an explicitly selected main-site checkout. */
import {cpSync,mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const source=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw Error('Usage: node scripts/export-main-site.mjs /path/to/deep-cuts-edh');
const site=resolve(process.argv[2]);
if(!existsSync(join(site,'src/community-core.js')))throw Error('Target must be the existing Deep Cuts EDH checkout');
const target=join(site,'games/hive-run');mkdirSync(target,{recursive:true});
for(const item of ['index.html','styles.css','src','assets'])cpSync(join(source,item),join(target,item),{recursive:true});
const index=join(target,'index.html');writeFileSync(index,readFileSync(index,'utf8').replace('href="/" aria-label="Deep Cuts Game Lab home"','href="/games.html" aria-label="Deep Cuts games"').replace('DEEP CUTS <strong>GAME LAB</strong>','DEEP CUTS <strong>ARCADE</strong>'));
mkdirSync(join(site,'src/hive-server'),{recursive:true});
writeFileSync(join(site,'src/hive-server/leaderboard.js'),readFileSync(join(source,'functions/api/leaderboard.js'),'utf8').replaceAll('../../src/','../../games/hive-run/src/'));
console.log('Exported Hive Run assets and replay handler. Main-site identity wrapper and navigation are maintained in the main-site repository.');
