// Placement trainer UI: an SVG base-game board set up like the rulebook's Variable
// Setup. Tap (or arrow-key to) a corner to see what a settlement there produces;
// neighbours are marked as blocked (distance rule); "Show best spots" reveals the
// top picks. The board is drawn once per shuffle; selection only toggles classes,
// so keyboard focus is never lost.

import { state } from "../state.js";
import { getVerdict } from "../tools/starting-spot.js";
import { generateBoard, rankCorners, bestSpots, hexCenter, hexVertices } from "./board.js";
import { createRng } from "./random.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const SCALE = 52; // SVG units per hex radius
const PAD = 16;
const HIT_RADIUS = 19;
const TOP_N = 3;
const WAYS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
const RES_ICON = { lumber: "🌲", brick: "🧱", wool: "🐑", grain: "🌾", ore: "⛰️", desert: "🏜️", water: "🌊" };
const ARROWS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

const fill = (template, vars) => String(template).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ""));

export function mount(root, { ui }) {
  const toolsUi = (state.data.ui && state.data.ui.tools && state.data.ui.tools.startingSpot) || {};
  const resLabel = (res) => (res === "water" ? ui.sea || "Sea" : toolsUi[`res_${res}`] || res);
  const view = { board: null, corners: [], byId: new Map(), best: [], selected: null, focus: 0, showBest: false, els: null };

  root.appendChild(text("p", "learn-lead", ui.intro ||
    "A random board, set up exactly like the rulebook's Variable Setup. Tap any corner to see what a settlement there would produce."));

  const controls = document.createElement("div");
  controls.className = "trainer-controls";
  const newBtn = button("trainer-btn", `🔀 ${ui.newBoard || "New board"}`);
  const bestBtn = button("trainer-btn", "");
  controls.append(newBtn, bestBtn);

  const layout = document.createElement("div");
  layout.className = "trainer-layout";
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "trainer-board");
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", ui.boardLabel || "Catan board — use the arrow keys to move between corners");
  const panel = document.createElement("div");
  panel.className = "trainer-panel";
  panel.setAttribute("aria-live", "polite");
  layout.append(svg, panel);
  root.append(controls, layout, text("p", "trainer-note", ui.note ||
    "Pips = the dots under each number: how many of the 36 dice combinations roll it. Harbors are not shown."));

  const refresh = () => {
    bestBtn.textContent = `⭐ ${view.showBest ? ui.hideBest || "Hide best spots" : ui.showBest || "Show best spots"}`;
    bestBtn.setAttribute("aria-pressed", String(view.showBest));
    update(view, resLabel, ui);
    renderPanel(panel, view, ui, toolsUi, resLabel);
  };
  const select = (id) => {
    view.selected = id;
    view.focus = id;
    refresh();
  };
  const move = (fromId, [dx, dy]) => {
    const from = view.byId.get(fromId);
    let best = null;
    view.corners.forEach((c) => {
      const [vx, vy] = [c.x - from.x, c.y - from.y];
      const dist = Math.hypot(vx, vy);
      if (!dist || (vx * dx + vy * dy) / dist < 0.5) return; // within ±60° of the arrow
      if (!best || dist < best.dist) best = { id: c.id, dist };
    });
    if (!best) return;
    view.focus = best.id;
    update(view, resLabel, ui);
    view.els.corners.get(best.id).focus();
  };
  const newBoard = () => {
    view.board = generateBoard(createRng());
    const ranked = rankCorners(view.board);
    view.byId = new Map(ranked.map((c, i) => [c.id, { ...c, rank: i + 1 }]));
    view.corners = [...view.byId.values()].sort((a, b) => a.id - b.id); // board order, not score order
    view.best = bestSpots(view.board, TOP_N).map((c) => c.id);
    view.selected = null;
    view.focus = view.corners[0].id;
    view.els = draw(svg, view, { select, move });
    refresh();
  };

  newBtn.addEventListener("click", newBoard);
  bestBtn.addEventListener("click", () => {
    view.showBest = !view.showBest;
    refresh();
  });
  newBoard();
}

function draw(svg, view, handlers) {
  const vertices = view.board.hexes.flatMap((h) => hexVertices(h.q, h.r));
  const xs = vertices.map((v) => v.x * SCALE);
  const ys = vertices.map((v) => v.y * SCALE);
  const [minX, minY] = [Math.min(...xs) - PAD, Math.min(...ys) - PAD];
  svg.setAttribute("viewBox", `${minX} ${minY} ${Math.max(...xs) - minX + PAD} ${Math.max(...ys) - minY + PAD}`);

  const hexes = new Map();
  const corners = new Map();
  const hexNodes = view.board.hexes.map((hex) => {
    const g = drawHex(hex);
    hexes.set(`${hex.q},${hex.r}`, g);
    return g;
  });
  const cornerNodes = view.corners.map((corner) => {
    const g = drawCorner(corner, handlers);
    corners.set(corner.id, g);
    return g;
  });
  svg.replaceChildren(...hexNodes, ...cornerNodes);
  return { hexes, corners };
}

function drawHex(hex) {
  const g = svgEl("g", { class: `hex hex-${hex.res}` });
  const points = hexVertices(hex.q, hex.r).map((v) => `${v.x * SCALE},${v.y * SCALE}`).join(" ");
  g.appendChild(svgEl("polygon", { points, class: "hex-shape" }));
  const { x, y } = hexCenter(hex.q, hex.r);
  const [cx, cy] = [x * SCALE, y * SCALE];
  g.appendChild(svgEl("text", { x: cx, y: cy - 24, class: "hex-icon", "aria-hidden": "true" }, RES_ICON[hex.res]));
  if (hex.num != null) {
    const hot = hex.num === 6 || hex.num === 8;
    g.appendChild(svgEl("circle", { cx, cy: cy + 4, r: 15, class: "hex-disc" }));
    g.appendChild(svgEl("text", { x: cx, y: cy + 8, class: `hex-num${hot ? " is-hot" : ""}`, "aria-hidden": "true" }, String(hex.num)));
    const pips = WAYS[hex.num];
    for (let i = 0; i < pips; i++) {
      g.appendChild(svgEl("circle", { cx: cx + (i - (pips - 1) / 2) * 4.2, cy: cy + 13.5, r: 1.4, class: `hex-pip${hot ? " is-hot" : ""}` }));
    }
  }
  return g;
}

function drawCorner(corner, { select, move }) {
  const [cx, cy] = [corner.x * SCALE, corner.y * SCALE];
  const g = svgEl("g", { class: "corner", role: "button", tabindex: "-1" });
  g.appendChild(svgEl("circle", { cx, cy, r: HIT_RADIUS, class: "corner-hit" }));
  g.appendChild(svgEl("circle", { cx, cy, r: 5, class: "corner-dot" }));
  g.appendChild(svgEl("text", { x: cx, y: cy - 11, class: "corner-rank", "aria-hidden": "true" }, ""));
  g.addEventListener("click", () => select(corner.id));
  g.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(corner.id);
    } else if (ARROWS[e.key]) {
      e.preventDefault();
      move(corner.id, ARROWS[e.key]);
    }
  });
  return g;
}

function update(view, resLabel, ui) {
  const selected = view.selected != null ? view.byId.get(view.selected) : null;
  const blocked = new Set(selected ? selected.neighbors : []);
  const highlighted = new Set(selected ? selected.hexes.filter((h) => h.q != null).map((h) => `${h.q},${h.r}`) : []);

  view.els.hexes.forEach((g, key) => {
    g.classList.toggle("is-highlighted", highlighted.has(key));
    g.classList.toggle("is-dimmed", selected != null && !highlighted.has(key));
  });
  view.els.corners.forEach((g, id) => {
    const corner = view.byId.get(id);
    const bestRank = view.showBest ? view.best.indexOf(id) + 1 : 0;
    const isSelected = id === view.selected;
    g.classList.toggle("is-selected", isSelected);
    g.classList.toggle("is-blocked", blocked.has(id));
    g.classList.toggle("is-best", bestRank > 0);
    g.querySelector(".corner-dot").setAttribute("r", isSelected ? 8 : 5);
    g.querySelector(".corner-rank").textContent = bestRank ? String(bestRank) : "";
    g.setAttribute("tabindex", id === view.focus ? "0" : "-1");
    g.setAttribute("aria-pressed", String(isSelected));
    const parts = [corner.hexes.map((h) => (h.num ? `${h.num} ${resLabel(h.res)}` : resLabel(h.res))).join(", ")];
    if (bestRank) parts.push(fill(ui.bestLabel || "best spot {n}", { n: bestRank }));
    if (blocked.has(id)) parts.push(ui.blockedLabel || "blocked by the distance rule");
    g.setAttribute("aria-label", parts.join(" — "));
  });
}

function renderPanel(panel, view, ui, toolsUi, resLabel) {
  const corner = view.selected != null ? view.byId.get(view.selected) : null;
  if (!corner) {
    panel.replaceChildren(
      text("p", "trainer-hint", `👆 ${ui.tapHint || "Tap a corner of the board to place a settlement."}`),
      text("p", "trainer-sub", ui.tapSub || "You'll see its production, how it ranks among all 54 corners, and which corners the distance rule blocks."),
    );
    return;
  }
  const verdict = getVerdict(corner.score.total, toolsUi);
  const head = document.createElement("div");
  head.className = "trainer-head";
  head.append(
    text("span", "trainer-rank", fill(ui.rank || "#{rank} of {total}", { rank: corner.rank, total: view.corners.length })),
    text("span", `trainer-verdict ${verdict.cls}`, verdict.label),
  );

  const list = document.createElement("ul");
  list.className = "trainer-hexes";
  corner.hexes.forEach((h) => {
    const li = document.createElement("li");
    li.append(
      text("span", "trainer-hex-icon", RES_ICON[h.res]),
      text("span", "trainer-hex-name", resLabel(h.res)),
      text("span", `trainer-hex-num${h.num === 6 || h.num === 8 ? " is-hot" : ""}`, h.num ? String(h.num) : "—"),
      text("span", "trainer-hex-pips", h.num ? "•".repeat(WAYS[h.num]) : ""),
    );
    list.appendChild(li);
  });

  const s = corner.score;
  const distinct = new Set(corner.hexes.filter((h) => h.num).map((h) => h.res)).size;
  panel.replaceChildren(
    head,
    list,
    text("p", "trainer-summary", fill(ui.summary || "{pips} pips · {kinds} resource types · score {score}", {
      pips: s.pips, kinds: distinct, score: s.total.toFixed(1),
    })),
    text("p", "trainer-sub", ui.blockedNote || "Faded corners are blocked: no settlement may be built next to another (distance rule)."),
  );
}

function svgEl(tag, attrs, content) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (content != null) node.textContent = content;
  return node;
}

function text(tag, className, value) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = value;
  return node;
}

function button(className, label) {
  const b = text("button", className, label);
  b.type = "button";
  return b;
}
