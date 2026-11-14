/** Milestone A: model-space anchors shared by hero / soldier; expanded by subsequent graft phases.
 * Coordinates are based on original 64px frames, not browser pixels. */
export const FRAME = 64;
export const ANCHORS = Object.freeze({
  hero: Object.freeze({head:[32,18],face:[32,19],neck:[32,26],shoulderLeft:[23,30],shoulderRight:[41,30],torso:[32,36],back:[32,32],forearmLeft:[19,39],forearmRight:[45,39],gripLeft:[19,45],gripRight:[45,45],hip:[32,46],footLeft:[27,58],footRight:[37,58],rear:[35,48]}),
  soldier: Object.freeze({head:[32,17],face:[32,20],neck:[32,26],shoulderLeft:[23,29],shoulderRight:[41,29],torso:[32,36],back:[32,32],forearmLeft:[19,39],forearmRight:[45,39],gripLeft:[19,43],gripRight:[45,43],hip:[32,46],footLeft:[27,58],footRight:[37,58],rear:[35,48]}),
});
export const BODY_REGIONS = Object.freeze(['head','face','jaw','neck','shoulders','torso','back','arms','hands','pelvis','legs','feet','rear','secondary']);
export const modelAnchor = (kind, name) => ANCHORS[kind]?.[name] || null;
