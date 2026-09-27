// Placement trainer UI: an SVG base-game board set up like the rulebook's Variable
// Setup. Tap a corner to see what a settlement there produces; neighbours are
// marked as blocked (distance rule); "Show best spots" reveals the top picks.

import { state } from "../state.js";
import { getVerdict } from "../tools/starting-spot.js";
import { generateBoard, rankCorners, bestSpots, hexCenter, hexVertices } from "./board.js";
import { createRng } from "./random.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const SCALE = 52; // SVG units per hex radius
const PAD = 14;
const TOP_N = 3;
const WAYS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
const RES_ICON = { lumber: "🌲", brick: "🧱", wool: "🐑", grain: "🌾", ore: "⛰️", desert: "🏜️" };

const fill = (template, vars) => String(template).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ""));

export function mount(root, { ui }) {
  const toolsUi = (state.data.ui && state.data.ui.tools && state.data.ui.tools.startingSpot) || {};
  const view = { board: null, ranked: [], byId: new Map(), best: [], selected: null, showBest: false };

  root.appendChild(text("p", "learn-lead", ui.intro ||
    "A random board, set up exactly like the rulebook's Variable Setup. Tap any corner to see what a settlement there would produce."));

  const controls = document.createElement("div");
  controls.className = "trainer-controls";
  const newBtn = button("trainer-btn", `🔀 ${ui.newBoard || "New board"}`);
  const bestBtn = button("trainer-btn", "");
  bestBtn.setAttribute("aria-pressed", "false");
  controls.append(newBtn, bestBtn);

  const layout = document.createElement("div");
  layout.className = "trainer-layout";
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "trainer-board");
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", ui.boardLabel || "Catan board");
  const panel = document.createElement("div");
  panel.className = "trainer-panel";
  panel.setAttribute("aria-live", "polite");
  layout.append(svg, panel);
  root.append(controls, layout, text("p", "trainer-note", ui.note ||
    "Pips = the dots under each number: how many of the 36 dice combinations roll it. Harbors are not shown."));

  const refreshBestLabel = () => {
    bestBtn.textContent = `⭐ ${view.showBest ? ui.hideBest || "Hide best spots" : ui.showBest || "Show best spots"}`;
    bestBtn.setAttribute("aria-pressed", String(view.showBest));
  };
  const select = (id) => {
    view.selected = id;
    draw(svg, view, select);
    renderPanel(panel, view, ui, toolsUi);
  };
  const newBoard = () => {
    view.board = generateBoard(createRng());
    view.ranked = rankCorners(view.board);
    view.byId = new Map(view.ranked.map((c, i) => [c.id, { ...c, rank: i + 1 }]));
    view.best = bestSpots(view.board, TOP_N).map((c) => c.id);
    select(null);
  };
  newBtn.addEventListener("click", newBoard);
  bestBtn.addEventListener("click", () => {
    view.showBest = !view.showBest;
    refreshBestLabel();
    draw(svg, view, select);
  });
  refreshBestLabel();
  newBoard();
}

function draw(svg, view, onSelect) {
  const vertices = view.board.hexes.flatMap((h) => hexVertices(h.q, h.r));
  const xs = vertices.map((v) => v.x * SCALE);
  const ys = vertices.map((v) => v.y * SCALE);
  const [minX, minY] = [Math.min(...xs) - PAD, Math.min(...ys) - PAD];
  svg.setAttribute("viewBox", `${minX} ${minY} ${Math.max(...xs) - minX + PAD} ${Math.max(...ys) - minY + PAD}`);

  const selected = view.selected != null ? view.byId.get(view.selected) : null;
  const blocked = new Set(selected ? selected.neighbors : []);
  const highlighted = new Set(selected ? selected.hexes.map((h) => `${h.q},${h.r}`) : []);

  svg.replaceChildren(
    ...view.board.hexes.map((hex) => drawHex(hex, highlighted.has(`${hex.q},${hex.r}`), selected != null)),
    ...view.ranked.map((corner) => drawCorner(view.byId.get(corner.id), {
      selected: corner.id === view.selected,
      blocked: blocked.has(corner.id),
      bestRank: view.showBest ? view.best.indexOf(corner.id) + 1 : 0,
    }, onSelect)),
  );
}

function drawHex(hex, isHighlighted, dimOthers) {
  const g = svgEl("g", { class: `hex hex-${hex.res}${isHighlighted ? " is-highlighted" : dimOthers ? " is-dimmed" : ""}` });
  const points = hexVertices(hex.q, hex.r).map((v) => `${v.x * SCALE},${v.y * SCALE}`).join(" ");
  g.appendChild(svgEl("polygon", { points, class: "hex-shape" }));
  const { x, y } = hexCenter(hex.q, hex.r);
  const [cx, cy] = [x * SCALE, y * SCALE];
  g.appendChild(svgEl("text", { x: cx, y: cy - 24, class: "hex-icon" }, RES_ICON[hex.res]));
  if (hex.num != null) {
    const hot = hex.num === 6 || hex.num === 8;
    g.appendChild(svgEl("circle", { cx, cy: cy + 4, r: 15, class: "hex-disc" }));
    g.appendChild(svgEl("text", { x: cx, y: cy + 8, class: `hex-num${hot ? " is-hot" : ""}` }, String(hex.num)));
    const pips = WAYS[hex.num];
    for (let i = 0; i < pips; i++) {
      g.appendChild(svgEl("circle", { cx: cx + (i - (pips - 1) / 2) * 4.2, cy: cy + 13.5, r: 1.4, class: `hex-pip${hot ? " is-hot" : ""}` }));
    }
  }
  return g;
}

function drawCorner(corner, flags, onSelect) {
  const [cx, cy] = [corner.x * SCALE, corner.y * SCALE];
  const classes = ["corner"];
  if (flags.selected) classes.push("is-selected");
  if (flags.blocked) classes.push("is-blocked");
  if (flags.bestRank) classes.push("is-best");
  const g = svgEl("g", { class: classes.join(" "), tabindex: "0", role: "button" });
  g.setAttribute("aria-label", corner.hexes.map((h) => (h.num ? `${h.num} ${h.res}` : h.res)).join(", "));
  g.appendChild(svgEl("circle", { cx, cy, r: 15, class: "corner-hit" }));
  g.appendChild(svgEl("circle", { cx, cy, r: flags.selected ? 8 : 5, class: "corner-dot" }));
  if (flags.bestRank) g.appendChild(svgEl("text", { x: cx, y: cy - 11, class: "corner-rank" }, String(flags.bestRank)));
  const activate = () => onSelect(corner.id);
  g.addEventListener("click", activate);
  g.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  });
  return g;
}

function renderPanel(panel, view, ui, toolsUi) {
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
    text("span", "trainer-rank", fill(ui.rank || "#{rank} of {total}", { rank: corner.rank, total: view.ranked.length })),
    text("span", `trainer-verdict ${verdict.cls}`, verdict.label),
  );

  const list = document.createElement("ul");
  list.className = "trainer-hexes";
  corner.hexes.forEach((h) => {
    const li = document.createElement("li");
    const label = toolsUi[`res_${h.res}`] || h.res;
    li.append(
      text("span", "trainer-hex-icon", RES_ICON[h.res]),
      text("span", "trainer-hex-name", label),
      text("span", `trainer-hex-num${h.num === 6 || h.num === 8 ? " is-hot" : ""}`, h.num ? String(h.num) : "—"),
      text("span", "trainer-hex-pips", h.num ? "•".repeat(WAYS[h.num]) : ""),
    );
    list.appendChild(li);
  });

  const s = corner.score;
  const distinct = new Set(corner.hexes.filter((h) => h.res !== "desert").map((h) => h.res)).size;
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
