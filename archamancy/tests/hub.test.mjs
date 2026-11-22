import {test} from "node:test";
import assert from "node:assert/strict";
import {hubFor,HUBS} from "../hub.mjs";
test("back links go to the Game Lab on the Lab and to the Arcade on the main site",()=>{
 for(const h of ["deep-cuts-game-lab.pages.dev","abc123.deep-cuts-game-lab.pages.dev","localhost","127.0.0.1","lab.test"])assert.deepEqual(hubFor(h),HUBS.lab,h);
 for(const h of ["deepcutsedh.com","www.deepcutsedh.com","deep-cuts-edh.pages.dev","example.org"])assert.deepEqual(hubFor(h),HUBS.arcade,h);
 assert.equal(HUBS.arcade.href,"/games");
 assert.deepEqual(hubFor("deep-cuts-game-lab.pages.dev","/games|Back to Arcade"),{href:"/games",label:"Back to Arcade"});
 assert.deepEqual(hubFor("x","javascript:alert(1)|Bad"),HUBS.arcade,"only site-relative paths are accepted");assert.deepEqual(hubFor("x","//evil.example|Bad"),HUBS.arcade,"no protocol-relative links");
});
