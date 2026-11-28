// Decorative motion aligned to the original painted title art.
// Coordinates are in the reference composition, 1648 x 928 (the WebP is the same aspect ratio).
// Feather the edges so the moving paint blends into the cover at the banks, trees and window.
const WATER=[
 ["river","M894 453 Q934 458 961 453 L969 466 Q939 478 912 470 Q879 478 877 492 L859 508 Q881 521 916 526 Q952 532 983 549 L1020 563 Q1000 586 947 591 Q914 596 901 617 Q913 628 937 626 L930 644 Q900 655 861 665 L827 665 L826 656 Q857 645 875 633 L881 615 Q887 594 921 583 L961 568 Q938 556 908 550 Q875 544 843 530 Q817 520 835 506 Q857 490 872 477Z",802,435,245,255],
 ["waterfall","M939 789 Q974 791 1008 805 Q1032 810 1061 826 Q1090 835 1119 853 L1166 868 Q1186 879 1217 881 Q1250 890 1325 928 L1151 928 Q1105 913 1083 894 Q1060 876 1033 873 Q1004 855 982 846 Q963 829 931 825 L922 815Z",900,770,445,162]
];
const FOG=[
 ["mist-one",785,407,98,19],["mist-two",952,412,109,20],
 ["mist-three",578,632,86,28],["mist-four",1515,306,96,22]
];
const painting='<use href="#ambience-paint"/>';
function flowingPaint(id,classes){
 return `<g class="${classes}" mask="url(#ambience-${id})">${painting}${painting}</g>`;
}
const SCENE=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1648 928" aria-hidden="true" focusable="false">
 <defs>
  <image id="ambience-paint" width="1648" height="928"/>
  <clipPath id="ambience-flag-main"><path d="M1302 31 Q1340 23 1380 48 T1450 66 Q1492 44 1523 77 Q1490 57 1445 89 Q1409 103 1375 84 Q1340 57 1302 68 Z"/></clipPath>
  <clipPath id="ambience-flag-upper"><path d="M1181 212 Q1197 209 1211 221 L1227 221 Q1216 227 1206 226 L1181 229Z"/></clipPath>
  <clipPath id="ambience-flag-right"><path d="M1420 333 Q1450 330 1473 352 Q1495 359 1519 365 Q1494 372 1470 367 Q1440 347 1420 353Z"/></clipPath>
  <clipPath id="ambience-flag-low"><path d="M1116 405 Q1130 406 1140 415 Q1155 421 1169 429 Q1152 425 1139 430 L1116 423Z"/></clipPath>
  <linearGradient id="ambience-cloth-light">
   <stop stop-color="#ffe0a0" stop-opacity="0"/><stop offset=".5" stop-color="#ffe7ae" stop-opacity=".48"/><stop offset="1" stop-color="#ffe0a0" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="ambience-feather">
   <stop offset=".37" stop-color="white"/><stop offset=".75" stop-color="white" stop-opacity=".53"/><stop offset="1" stop-color="white" stop-opacity="0"/>
  </radialGradient>
  <filter id="ambience-water-feather"><feGaussianBlur stdDeviation="5"/></filter>
  ${WATER.map(([id,path,x,y,w,h])=>`<mask id="ambience-${id}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><path d="${path}" fill="white" filter="url(#ambience-water-feather)"/></mask>`).join("")}
  ${FOG.map(([id,x,y,rx,ry])=>`<mask id="ambience-${id}" maskUnits="userSpaceOnUse" x="${x-rx}" y="${y-ry}" width="${2*rx}" height="${2*ry}"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#ambience-feather)"/></mask>`).join("")}
  <mask id="ambience-flame" maskUnits="userSpaceOnUse" x="1275" y="183" width="46" height="54"><ellipse cx="1298" cy="210" rx="23" ry="27" fill="url(#ambience-feather)"/></mask>
 </defs>
 <g class="ambience-flags" opacity=".82">
  <g clip-path="url(#ambience-flag-main)">
   <use class="ambience-flag flag-main" href="#ambience-paint"/>
   <path class="ambience-flag-light" d="M1310 19 L1353 19 L1410 105 L1360 105Z" fill="url(#ambience-cloth-light)"/>
  </g>
  <g clip-path="url(#ambience-flag-upper)"><use class="ambience-flag flag-upper" href="#ambience-paint"/></g>
  <g clip-path="url(#ambience-flag-right)"><use class="ambience-flag flag-right" href="#ambience-paint"/></g>
  <g clip-path="url(#ambience-flag-low)"><use class="ambience-flag flag-low" href="#ambience-paint"/></g>
 </g>
 <g mask="url(#ambience-flame)"><use class="ambience-fire" href="#ambience-paint"/></g>
 ${FOG.map(([id])=>flowingPaint(id,"ambience-fog "+id)).join("")}
 ${WATER.map(([id])=>flowingPaint(id,"ambience-water ambience-"+id)).join("")}
</svg>`;
export function mountTitleAmbience(title){
 if(title.querySelector(".title-ambience"))return;
 const layer=document.createElement("div");
 layer.className="title-ambience";
 layer.setAttribute("aria-hidden","true");
 const parsed=new DOMParser().parseFromString(SCENE,"image/svg+xml");
 const svg=document.importNode(parsed.documentElement,true);
 svg.querySelector("image").setAttribute("href",new URL("./assets/river-keep.webp",import.meta.url).href);
 layer.append(svg);
 title.prepend(layer);
}
