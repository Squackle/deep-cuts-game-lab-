// Decorative motion aligned to the original painted title art.
// Coordinates are in the reference composition, 1648 x 928 (the WebP is the same aspect ratio).
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
  <radialGradient id="ambience-glow"><stop stop-color="#fff1ab" stop-opacity=".8"/><stop offset=".42" stop-color="#ffb24d" stop-opacity=".32"/><stop offset="1" stop-color="#ff9c3a" stop-opacity="0"/></radialGradient>
  <radialGradient id="ambience-mist"><stop stop-color="#d9e7e4" stop-opacity=".28"/><stop offset=".48" stop-color="#c4d8dd" stop-opacity=".13"/><stop offset="1" stop-color="#bbcdd0" stop-opacity="0"/></radialGradient>
  <linearGradient id="ambience-stream" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#eaf9f4" stop-opacity=".08"/><stop offset=".6" stop-color="#eef9f3" stop-opacity=".65"/><stop offset="1" stop-color="#ccf0ee" stop-opacity=".12"/></linearGradient>
  <clipPath id="ambience-water"><path d="M868 448 L1005 448 980 480 933 500 854 520 907 542 995 553 1041 572 995 592 943 609 883 632 930 645 839 675 823 659 888 624 935 599 975 571 902 559 822 529 823 509 890 488 946 470Z M924 774 L1087 778 1099 806 1164 818 1180 849 1240 880 1390 928 965 928 963 901 1036 868 1017 844 916 830 907 810Z"/></clipPath>
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
 <g class="ambience-fire">
  <ellipse cx="1297" cy="218" rx="37" ry="43" fill="url(#ambience-glow)" opacity=".79"/>
  <path d="M1287 231 Q1280 222 1289 211 Q1299 200 1296 187 Q1311 201 1306 213 Q1316 221 1307 231Z" fill="#ffb246" opacity=".72"/>
  <path d="M1292 231 Q1288 224 1295 217 Q1301 211 1300 204 Q1309 216 1302 231Z" fill="#fff1af" opacity=".85"/>
 </g>
 <g class="ambience-sparks" fill="#ffda82">
  <ellipse cx="1295" cy="212" rx="2.2" ry="3.1"/>
  <ellipse cx="1303" cy="213" rx="1.6" ry="2.4"/>
  <ellipse cx="1298" cy="222" rx="2.5" ry="3.3"/>
  <ellipse cx="1289" cy="218" rx="1.4" ry="2.1"/>
 </g>
 <g fill="url(#ambience-mist)" class="ambience-fog">
  <ellipse class="mist-one" cx="786" cy="409" rx="85" ry="20" opacity=".42"/>
  <ellipse class="mist-two" cx="971" cy="413" rx="106" ry="25" opacity=".48"/>
  <ellipse class="mist-three" cx="566" cy="624" rx="90" ry="36" opacity=".42"/>
  <ellipse class="mist-four" cx="1538" cy="308" rx="91" ry="27" opacity=".40"/>
 </g>
 <g clip-path="url(#ambience-water)" fill="none" stroke-linecap="round">
  <g class="ambience-river" stroke="#c9e9e8" stroke-width="2.4" opacity=".38">
   <path d="M901 468 Q940 463 969 457 M846 518 Q868 511 892 509 M908 545 Q940 551 978 552 M1003 572 Q985 580 969 580 M924 616 Q905 622 887 633 M857 664 Q873 659 887 655"/>
  </g>
  <g class="ambience-waterfall" stroke="url(#ambience-stream)" stroke-width="3.5" opacity=".38">
   <path d="M932 803 Q949 816 967 820 T1015 829 M974 823 Q996 834 1012 836 T1042 849 M1040 853 Q1067 866 1089 866 T1135 878 M1117 870 Q1147 880 1172 889 T1234 913 M1051 897 Q1079 906 1100 917 T1134 928"/>
  </g>
 </g>
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
