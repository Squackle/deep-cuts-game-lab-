import {CHAPTERS, CHALLENGES, COMMANDER_TRIALS} from "./missions.mjs";
import {REGIONS, missionOpen, missionStars, mapOpen} from "./progress.mjs";
import {NODES, paintWorld} from "./worldmap.mjs";

const roadHeights = [.65, .34, .59, .28, .52];
const categoryNames = ["Mission road", "Challenges", "Commander trials"];

function element(tag, className, content) {
 const el = document.createElement(tag);
 if (className) el.className = className;
 if (content) el.textContent = content;
 return el;
}

function button(className, content, action) {
 const el = element("button", className, content);
 el.type = "button";
 el.addEventListener("click", action);
 return el;
}

function canvas(className, width, height) {
 const el = element("canvas", className);
 el.width = width;
 el.height = height;
 el.setAttribute("aria-hidden", "true");
 return el;
}

function place(el, x, y) {
 el.style.left = x * 100 + "%";
 el.style.top = y * 100 + "%";
}

function paintRoad(canvas, points, entries, profile) {
 const ctx = canvas.getContext("2d");
 const {width, height} = canvas;
 ctx.clearRect(0, 0, width, height);
 ctx.lineCap = "round";
 for (let index = 1; index < points.length; index++) {
  const [x, y] = points[index].map((value, axis) => value * (axis ? height : width));
  const [px, py] = points[index - 1].map((value, axis) => value * (axis ? height : width));
  const middle = (x + px) / 2;
  const open = missionOpen(profile, entries[index]);
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.bezierCurveTo(middle, py, middle, y, x, y);
  ctx.setLineDash([]);
  ctx.strokeStyle = "#142017e8";
  ctx.lineWidth = 15;
  ctx.stroke();
  ctx.strokeStyle = open ? "#d6aa60" : "#9e9b85";
  ctx.lineWidth = 7;
  ctx.setLineDash(open ? [] : [12, 11]);
  ctx.stroke();
 }
}

export function createCampaignAtlas({profile, paintRegion, lockReason, savedMission, onResume, onLaunch, onNavigate}) {
 const dialog = element("dialog", "campaign-atlas");
 dialog.setAttribute("aria-labelledby", "atlas-title");
 const header = element("header", "atlas-header");
 const title = element("h2");
 title.id = "atlas-title";
 title.tabIndex = -1;
 const back = button("atlas-back", "‹ World map", () => {
  onNavigate();
  showWorld(regionIndex);
 });
 const titleBlock = element("div", "atlas-heading");
 const subtitle = element("p", "atlas-subtitle");
 titleBlock.append(title, subtitle);
 const close = button("atlas-close", "×", () => dialog.close());
 close.setAttribute("aria-label", "Close campaign map");
 header.append(back, titleBlock, close);

 const viewport = element("div", "atlas-viewport");
 const footer = element("footer", "atlas-footer");
 const worldArt = canvas("atlas-world-art", 1200, 480);
 paintWorld(worldArt.getContext("2d"), worldArt.width, worldArt.height);
 const regionArt = canvas("atlas-region-art", 1000, 600);
 dialog.append(header, viewport, footer);
 let regionIndex = null;
 let zoom;

 function updateFooter() {
  const save = savedMission();
  footer.replaceChildren();
  footer.hidden = !save;
  if (save) footer.append(button("atlas-resume", "Continue " + save.name + " · Wave " + save.wave, onResume));
 }

 function showWorld(focusIndex = null) {
  zoom?.cancel();
  zoom = null;
  regionIndex = null;
  back.hidden = true;
  title.textContent = "Campaign Map";
  subtitle.textContent = "Choose a region to explore its mission road.";
  const frame = element("div", "atlas-world");
  const scene = element("div", "atlas-world-scene");
  scene.append(worldArt);
  const pins = REGIONS.map((region, index) => {
   const chapter = CHAPTERS[region.map];
   const unlocked = mapOpen(profile, region.map);
   const cleared = chapter.filter(mission => missionStars(profile, mission)).length;
   const pin = button("atlas-region-pin", "", () => enterRegion(index));
   pin.classList.toggle("is-locked", !unlocked);
   place(pin, ...NODES[index]);
   const marker = element("span", "atlas-medallion", unlocked ? String(index + 1) : "🔒");
   marker.setAttribute("aria-hidden", "true");
   pin.append(
    marker,
    element("span", "atlas-region-label", region.name),
    element("span", "atlas-region-progress", unlocked ? cleared + " / " + chapter.length + " cleared" : "Locked")
   );
   scene.append(pin);
   return pin;
  });
  frame.append(scene);
  dialog.append(footer);
  viewport.replaceChildren(frame);
  dialog.scrollTop = 0;
  if (focusIndex !== null) pins[focusIndex]?.focus({preventScroll:true});
 }

 function enterRegion(index, animate = true) {
  if (zoom) return;
  onNavigate();
  const scene = viewport.querySelector(".atlas-world-scene");
  if (!animate || !scene || matchMedia("(prefers-reduced-motion: reduce)").matches) {
   showRegion(index);
   return;
  }
  const [x, y] = NODES[index].map(value => value * 100);
  scene.style.transformOrigin = x + "% " + y + "%";
  const animation = scene.animate([
   {transform:"none", opacity:1},
   {transform:`translate(${50 - x}%, ${50 - y}%) scale(2.75)`, opacity:.28}
  ], {duration:290, easing:"cubic-bezier(.35,0,.25,1)", fill:"forwards"});
  zoom = animation;
  animation.onfinish = () => {
   if (zoom !== animation) return;
   zoom = null;
   if (dialog.open) showRegion(index);
  };
 }

 function showRegion(index) {
  regionIndex = index;
  const region = REGIONS[index];
  const map = region.map;
  const chapter = CHAPTERS[map];
  const groups = [chapter, CHALLENGES.filter(m => m.mapId === map), COMMANDER_TRIALS.filter(m => m.mapId === map)];
  title.textContent = region.name;
  back.hidden = false;
  paintRegion(regionArt.getContext("2d"), map);
  const categories = element("nav", "atlas-categories");
  categories.setAttribute("aria-label", "Mission categories");
  const toolbar = element("div", "atlas-toolbar");
  toolbar.append(categories, footer);
  const regionBody = element("div", "atlas-region-body");
  viewport.replaceChildren(toolbar, regionBody);
  const categoryButtons = categoryNames.map((name, groupIndex) => {
   const categoryButton = button("atlas-category", name, () => {
    onNavigate();
    showGroup(groupIndex);
   });
   categories.append(categoryButton);
   return categoryButton;
  });

  function showGroup(groupIndex) {
   const entries = groups[groupIndex];
   const cleared = entries.filter(mission => missionStars(profile, mission)).length;
   subtitle.textContent = mapOpen(profile, map) ? cleared + " of " + entries.length + " " + (groupIndex ? "cleared" : "campaign missions cleared") : lockReason(map);
   categoryButtons.forEach((entry, i) => entry.setAttribute("aria-pressed", String(i === groupIndex)));

   const road = groupIndex === 0;
   const board = element("div", road ? "atlas-road" : "atlas-optional");
   const detail = element("section", "atlas-briefing");
   detail.setAttribute("aria-label", "Mission briefing");
   if (road) {
    board.append(regionArt);
    const roadArt = canvas("atlas-road-art", 1000, 460);
    const points = entries.map((_, i) => [.13 + .74 * i / (entries.length - 1), roadHeights[i]]);
    paintRoad(roadArt, points, entries, profile);
    board.append(roadArt);
    regionBody.replaceChildren(board, detail);
    addMissions(points);
   } else {
    regionBody.replaceChildren(board, detail);
    addMissions();
   }

   function addMissions(points) {
    const pins = entries.map((mission, i) => {
     const open = missionOpen(profile, mission);
     const stars = missionStars(profile, mission);
     const state = stars ? stars + " of 3 stars" : open ? "Ready" : "Locked";
     const pin = button(road ? "atlas-mission-pin" : "atlas-optional-pin", "", () => {
      onNavigate();
      inspect(i);
     });
     pin.classList.toggle("is-locked", !open);
     pin.classList.toggle("is-cleared", !!stars);
     if (points) {
      place(pin, ...points[i]);
      const marker = element("span", "atlas-medallion", !open ? "🔒" : mission.finale ? "⚑" : String(i + 1));
      marker.setAttribute("aria-hidden", "true");
      pin.append(marker);
     }
     pin.append(
      element("span", "atlas-mission-label", mission.name),
      element("span", "atlas-mission-status", stars ? "★".repeat(stars) + "☆".repeat(3 - stars) : state)
     );
     pin.setAttribute("aria-label", mission.name + ", " + state);
     board.append(pin);
     return pin;
    });
    const next = entries.findIndex(mission => missionOpen(profile, mission) && !missionStars(profile, mission));
    inspect(next >= 0 ? next : 0);

    function inspect(i) {
     const mission = entries[i];
     const open = missionOpen(profile, mission);
     const stars = missionStars(profile, mission);
     const description = open ? mission.briefing : !mapOpen(profile, map) ? lockReason(map)
      : mission.category === "challenge" ? "Clear the Regional Gauntlet to unlock."
      : "Clear " + chapter[i - 1].name + " to unlock.";
     pins.forEach((pin, position) => pin.setAttribute("aria-pressed", String(position === i)));
     const meta = (mission.finale ? 25 : mission.waves.length) + " waves" + (stars ? " · " + "★".repeat(stars) + "☆".repeat(3 - stars) : "");
     const launch = button("atlas-launch", open ? stars ? "Replay mission" : "Deploy" : "Locked", () => onLaunch(mission));
     launch.disabled = !open;
     detail.replaceChildren(
      element("span", "atlas-mission-meta", meta),
      element("h3", "", mission.name),
      element("p", "", description),
      launch
     );
    }
   }
  }
  showGroup(0);
  dialog.scrollTop = 0;
  back.focus({preventScroll:true});
 }

 dialog.addEventListener("close", () => {
  if (!dialog.open) {
   zoom?.cancel();
   zoom = null;
  }
 });
 dialog.addEventListener("cancel", event => {
  if (regionIndex === null) return;
  event.preventDefault();
  showWorld(regionIndex);
 });

 function open(map) {
  showWorld();
  updateFooter();
  dialog.showModal();
  title.focus({preventScroll:true});
  const index = REGIONS.findIndex(region => region.map === map);
  if (index >= 0) enterRegion(index);
 }

 return {dialog, open};
}
