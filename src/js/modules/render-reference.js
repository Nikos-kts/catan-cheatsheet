// Reference-tab renderer (📋). Shows hard numeric info:
//   1. Building costs
//   2. Dice probabilities (always identical — two 6-sided dice)
//   3. Trading ratios
//   4. Turn flow
//
// Content is pulled from `state.data.games[<id>].reference` with a fallback
// to `state.data.games.base.reference` when an expansion hasn't overridden
// the section. UI labels live under `state.data.ui.reference`.

import { state } from "./state.js";
import { initAccordions } from "./accordions.js";

// The dice table is a mathematical constant — we generate it locally rather
// than duplicating numbers across every language file.
const DICE_ROWS = [
  { n: 2, ways: 1 },
  { n: 3, ways: 2 },
  { n: 4, ways: 3 },
  { n: 5, ways: 4 },
  { n: 6, ways: 5 },
  { n: 7, ways: 6 },
  { n: 8, ways: 5 },
  { n: 9, ways: 4 },
  { n: 10, ways: 3 },
  { n: 11, ways: 2 },
  { n: 12, ways: 1 },
];

export function renderReference(game) {
  const main = document.getElementById("content");
  main.innerHTML = "";

  const ui = (state.data.ui && state.data.ui.reference) || {};
  const baseRef =
    (state.data.games &&
      state.data.games.base &&
      state.data.games.base.reference) ||
    {};
  const ref = mergeRef(baseRef, game.reference || {});

  // Hero description (reuse existing game description styling)
  if (ui.heading) {
    const desc = document.createElement("div");
    desc.className = "game-description";
    const title = document.createElement("div");
    title.className = "game-description-title";
    title.textContent = ui.heading;
    desc.appendChild(title);
    if (ui.subheading) {
      const p = document.createElement("p");
      p.textContent = ui.subheading;
      desc.appendChild(p);
    }
    main.appendChild(desc);
  }

  // 1. Building costs
  appendCollapsible(
    main,
    "🔨",
    ui.buildingCosts || "Building Costs",
    renderBuildingCosts(ref.buildingCosts || []),
    (ref.buildingCosts || []).length,
    ui.countItems || "items",
    "reference-building",
  );

  // 2. Dice probabilities
  appendCollapsible(
    main,
    "🎲",
    ui.diceProbabilities || "Dice Probabilities",
    renderDiceTable(ui),
    DICE_ROWS.length,
    ui.countRolls || "rolls",
    "reference-dice",
  );

  // 3. Trading ratios
  appendCollapsible(
    main,
    "🤝",
    ui.tradingRatios || "Trading Ratios",
    renderTrading(ref.trading || [], ref.tradingNote),
    (ref.trading || []).length,
    ui.countRatios || "ratios",
    "reference-trading",
  );

  // 4. Turn flow
  appendCollapsible(
    main,
    "🔁",
    ui.turnFlow || "Turn Flow",
    renderTurnFlow(ref.turnFlow || []),
    (ref.turnFlow || []).length,
    ui.countSteps || "steps",
    "reference-turn",
  );

  initAccordions();
}

// Merge base reference with game-specific overrides. Arrays are replaced
// wholesale when present in the override (full control); strings too.
function mergeRef(base, override) {
  const out = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(override)]);
  keys.forEach((k) => {
    if (override[k] !== undefined) out[k] = override[k];
    else out[k] = base[k];
  });
  return out;
}

function appendCollapsible(parent, icon, title, body, count, countLabel, id) {
  const details = document.createElement("details");
  details.className = "subcategory-collapsible section-collapsible";
  details.id = id;
  const summary = document.createElement("summary");
  summary.className = "subcategory-summary section-summary";
  summary.innerHTML = `${icon} ${title} <span class="subcategory-count">${count} ${countLabel}</span>`;
  details.appendChild(summary);

  const bodyWrap = document.createElement("div");
  bodyWrap.className = "collapsible-body";
  bodyWrap.appendChild(body);
  details.appendChild(bodyWrap);

  parent.appendChild(details);
}

function renderBuildingCosts(items) {
  const grid = document.createElement("div");
  grid.className = "reference-grid";

  if (!items.length) {
    grid.appendChild(emptyHint());
    return grid;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "reference-card";

    const head = document.createElement("div");
    head.className = "reference-card-head";
    const icon = document.createElement("span");
    icon.className = "reference-card-icon";
    icon.textContent = item.icon || "🔨";
    head.appendChild(icon);
    const name = document.createElement("span");
    name.className = "reference-card-name";
    name.textContent = item.name || "";
    head.appendChild(name);
    if (item.vp != null && item.vp !== "") {
      const vp = document.createElement("span");
      vp.className = "reference-card-vp";
      vp.textContent = item.vp;
      head.appendChild(vp);
    }
    card.appendChild(head);

    if (Array.isArray(item.cost) && item.cost.length) {
      const row = document.createElement("div");
      row.className = "reference-cost-row";
      item.cost.forEach((c) => {
        const chip = document.createElement("span");
        chip.className = "cost-chip";
        chip.setAttribute("data-tooltip", c.resource || c.label || "");
        if (c.image) {
          const img = document.createElement("img");
          img.src = c.image;
          img.alt = c.resource || c.label || "";
          img.loading = "lazy";
          img.onerror = () => {
            img.replaceWith(document.createTextNode(c.icon || "•"));
          };
          chip.appendChild(img);
        } else if (c.icon) {
          const span = document.createElement("span");
          span.textContent = c.icon;
          chip.appendChild(span);
        }
        const qty = document.createElement("span");
        qty.className = "cost-qty";
        qty.textContent = `×${c.qty || 1}`;
        chip.appendChild(qty);
        row.appendChild(chip);
      });
      card.appendChild(row);
    }

    if (item.note) {
      const note = document.createElement("p");
      note.className = "reference-note";
      note.textContent = item.note;
      card.appendChild(note);
    }

    grid.appendChild(card);
  });

  return grid;
}

function renderDiceTable(ui) {
  const wrap = document.createElement("div");
  wrap.className = "dice-table-wrap";

  const table = document.createElement("table");
  table.className = "dice-table";

  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  [
    ui.colRoll || "Roll",
    ui.colWays || "Ways (of 36)",
    ui.colProb || "Probability",
    ui.colPips || "Pips (dots)",
  ].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  DICE_ROWS.forEach(({ n, ways }) => {
    const tr = document.createElement("tr");
    if (n === 7) tr.className = "dice-seven";

    const tdN = document.createElement("td");
    tdN.className = "dice-num";
    tdN.textContent = String(n);
    tr.appendChild(tdN);

    const tdW = document.createElement("td");
    tdW.textContent = `${ways}/36`;
    tr.appendChild(tdW);

    const tdP = document.createElement("td");
    tdP.textContent = `${((ways / 36) * 100).toFixed(2)}%`;
    tr.appendChild(tdP);

    const tdPips = document.createElement("td");
    tdPips.className = "dice-pips-cell";
    // pips = min(ways, 5) — number-token red-dot count on Catan discs
    const pipCount = Math.min(ways, 5);
    tdPips.setAttribute(
      "data-tooltip",
      `${pipCount} ${(ui.pipTooltip || "dots on the number token").toString()}`,
    );
    for (let i = 0; i < pipCount; i++) {
      const dot = document.createElement("span");
      dot.className = "dice-pip";
      tdPips.appendChild(dot);
    }
    tr.appendChild(tdPips);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  wrap.appendChild(table);

  if (ui.diceNote) {
    const note = document.createElement("p");
    note.className = "reference-note";
    note.textContent = ui.diceNote;
    wrap.appendChild(note);
  }

  return wrap;
}

function renderTrading(rows, noteText) {
  const wrap = document.createElement("div");
  wrap.className = "reference-trading";

  if (!rows.length) {
    wrap.appendChild(emptyHint());
    return wrap;
  }

  const ul = document.createElement("ul");
  ul.className = "rule-list";
  rows.forEach((r) => {
    const li = document.createElement("li");
    li.className = "rule-item";
    if (r.title) {
      const t = document.createElement("div");
      t.className = "rule-title";
      t.textContent = `${r.icon ? r.icon + " " : ""}${r.title}${r.ratio ? " — " + r.ratio : ""}`;
      li.appendChild(t);
    }
    if (r.detail) {
      const d = document.createElement("div");
      d.className = "rule-detail";
      d.textContent = r.detail;
      li.appendChild(d);
    }
    ul.appendChild(li);
  });
  wrap.appendChild(ul);

  if (noteText) {
    const note = document.createElement("p");
    note.className = "reference-note";
    note.textContent = noteText;
    wrap.appendChild(note);
  }

  return wrap;
}

function renderTurnFlow(steps) {
  const wrap = document.createElement("div");
  wrap.className = "reference-turn-flow";

  if (!steps.length) {
    wrap.appendChild(emptyHint());
    return wrap;
  }

  const ol = document.createElement("ol");
  ol.className = "turn-flow-list";
  steps.forEach((s, idx) => {
    const li = document.createElement("li");
    li.className = "turn-flow-step";

    const num = document.createElement("span");
    num.className = "turn-flow-num";
    num.textContent = String(idx + 1);
    li.appendChild(num);

    const body = document.createElement("div");
    body.className = "turn-flow-body";
    if (typeof s === "string") {
      body.textContent = s;
    } else {
      if (s.title) {
        const t = document.createElement("div");
        t.className = "rule-title";
        t.textContent = `${s.icon ? s.icon + " " : ""}${s.title}`;
        body.appendChild(t);
      }
      if (s.detail) {
        const d = document.createElement("div");
        d.className = "rule-detail";
        d.textContent = s.detail;
        body.appendChild(d);
      }
    }
    li.appendChild(body);

    ol.appendChild(li);
  });
  wrap.appendChild(ol);
  return wrap;
}

function emptyHint() {
  const el = document.createElement("p");
  el.className = "reference-note";
  el.textContent = "—";
  return el;
}
