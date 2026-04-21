// Strategy-tab renderer (🧠). Shows tips bucketed by level (beginner,
// intermediate, advanced) with a pill filter (All + per-level). A secondary
// checkbox group lets users overlay strategy tips from *other* games
// (persisted as `catan-strategy-extras`).

import { state } from "./state.js";
import { initAccordions } from "./accordions.js";
import { setJSON } from "./storage.js";
import { STORAGE_KEYS } from "./constants.js";

const LEVELS = ["beginner", "intermediate", "advanced"];

export function renderStrategy(game) {
  const main = document.getElementById("content");
  main.innerHTML = "";

  const ui = (state.data.ui && state.data.ui.strategy) || {};

  // Heading
  const desc = document.createElement("div");
  desc.className = "game-description";
  const title = document.createElement("div");
  title.className = "game-description-title";
  title.textContent = ui.heading || "Strategy Guide";
  desc.appendChild(title);
  if (ui.subheading) {
    const p = document.createElement("p");
    p.textContent = ui.subheading;
    desc.appendChild(p);
  }
  main.appendChild(desc);

  // Build combined tips list: primary game + any overlay extras.
  const primary = game.strategy || {};
  const overlays = getOverlayStrategies();

  // Level pill filter
  const pills = document.createElement("div");
  pills.className = "pill-bar";
  pills.setAttribute("role", "tablist");
  pills.setAttribute("aria-label", ui.filterLabel || "Filter by level");

  const pillAll = makePill(ui.levelAll || "All", "all", true);
  pills.appendChild(pillAll);
  LEVELS.forEach((lvl) => {
    const label = ui["level_" + lvl] || capitalize(lvl);
    pills.appendChild(makePill(label, lvl, false));
  });
  main.appendChild(pills);

  // Overlay toggle (secondary) — "Also show strategy from:"
  const extrasWrap = buildExtrasToggle(ui);
  if (extrasWrap) main.appendChild(extrasWrap);

  // Body container holding the level sections; re-rendered on filter change.
  const body = document.createElement("div");
  body.className = "strategy-body";
  main.appendChild(body);

  function renderLevels(activeLevel) {
    body.innerHTML = "";
    let anyShown = false;

    LEVELS.forEach((lvl) => {
      if (activeLevel !== "all" && activeLevel !== lvl) return;

      const tips = collectTips(lvl, primary, overlays, ui);
      if (!tips.length) return;
      anyShown = true;

      const section = document.createElement("details");
      section.className = "subcategory-collapsible section-collapsible";
      section.open = activeLevel === lvl; // auto-open when filtered

      const sum = document.createElement("summary");
      sum.className = "subcategory-summary section-summary";
      const levelLabel = ui["level_" + lvl] || capitalize(lvl);
      sum.innerHTML = `${levelIcon(lvl)} ${levelLabel} <span class="subcategory-count">${tips.length} ${ui.countTips || "tips"}</span>`;
      section.appendChild(sum);

      const list = document.createElement("div");
      list.className = "strategy-list";
      tips.forEach((tip) => list.appendChild(buildTipCard(tip, ui)));

      const bodyWrap = document.createElement("div");
      bodyWrap.className = "collapsible-body";
      bodyWrap.appendChild(list);
      section.appendChild(bodyWrap);

      body.appendChild(section);
    });

    if (!anyShown) {
      const empty = document.createElement("p");
      empty.className = "loading";
      empty.textContent = ui.empty || "No strategy tips for this selection yet.";
      body.appendChild(empty);
    }

    initAccordions();
  }

  // Pill click handler
  pills.querySelectorAll(".pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      pills.querySelectorAll(".pill").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      renderLevels(btn.dataset.level);
    });
  });

  renderLevels("all");
}

function buildExtrasToggle(ui) {
  const others = Object.entries(state.data.games || {}).filter(
    ([id]) => id !== state.game,
  );
  if (!others.length) return null;

  const wrap = document.createElement("div");
  wrap.className = "strategy-extras";

  const label = document.createElement("div");
  label.className = "strategy-extras-label";
  label.textContent = ui.extrasLabel || "Also show strategy from:";
  wrap.appendChild(label);

  const row = document.createElement("div");
  row.className = "strategy-extras-row";

  others.forEach(([id, g]) => {
    // Only offer games that actually have a strategy block.
    if (!g.strategy) return;
    const chk = document.createElement("label");
    chk.className = "strategy-extra-chip";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = id;
    input.checked = state.strategyExtras.includes(id);
    input.addEventListener("change", () => {
      if (input.checked) {
        if (!state.strategyExtras.includes(id)) state.strategyExtras.push(id);
      } else {
        state.strategyExtras = state.strategyExtras.filter((x) => x !== id);
      }
      setJSON(STORAGE_KEYS.strategyExtras, state.strategyExtras);
      // Re-render whole tab to pick up new tips.
      renderStrategy(state.data.games[state.game]);
    });
    chk.appendChild(input);
    const span = document.createElement("span");
    span.textContent = g.name || id;
    chk.appendChild(span);
    row.appendChild(chk);
  });

  if (!row.childNodes.length) return null;
  wrap.appendChild(row);
  return wrap;
}

function getOverlayStrategies() {
  const out = [];
  (state.strategyExtras || []).forEach((id) => {
    const g = state.data.games && state.data.games[id];
    if (g && g.strategy) out.push({ id, name: g.name || id, strategy: g.strategy });
  });
  return out;
}

function collectTips(level, primaryStrategy, overlays, ui) {
  const out = [];
  const primaryTips = Array.isArray(primaryStrategy[level])
    ? primaryStrategy[level]
    : [];
  primaryTips.forEach((t) => out.push({ ...t, _source: null }));
  overlays.forEach((ov) => {
    const tips = Array.isArray(ov.strategy[level]) ? ov.strategy[level] : [];
    tips.forEach((t) =>
      out.push({ ...t, _source: ov.name, _sourceBadge: ui.overlayBadge || "from" }),
    );
  });
  return out;
}

function buildTipCard(tip, ui) {
  const card = document.createElement("article");
  card.className = "strategy-card";

  const head = document.createElement("div");
  head.className = "strategy-card-head";
  const icon = document.createElement("span");
  icon.className = "strategy-card-icon";
  icon.textContent = tip.icon || "💡";
  head.appendChild(icon);
  const title = document.createElement("span");
  title.className = "strategy-card-title";
  title.textContent = tip.title || "";
  head.appendChild(title);

  if (tip._source) {
    const badge = document.createElement("span");
    badge.className = "strategy-card-source";
    badge.textContent = `${tip._sourceBadge || "from"} ${tip._source}`;
    head.appendChild(badge);
  }

  card.appendChild(head);

  if (tip.body) {
    const body = document.createElement("p");
    body.className = "strategy-card-body";
    body.textContent = tip.body;
    card.appendChild(body);
  }

  if (Array.isArray(tip.tags) && tip.tags.length) {
    const tags = document.createElement("div");
    tags.className = "strategy-card-tags";
    tip.tags.forEach((t) => {
      const tag = document.createElement("span");
      tag.className = "strategy-tag";
      tag.textContent = `#${t}`;
      tags.appendChild(tag);
    });
    card.appendChild(tags);
  }

  return card;
}

function makePill(label, level, active) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pill" + (active ? " active" : "");
  btn.dataset.level = level;
  btn.textContent = label;
  btn.setAttribute("role", "tab");
  btn.setAttribute("aria-selected", active ? "true" : "false");
  return btn;
}

function levelIcon(level) {
  switch (level) {
    case "beginner":
      return "🌱";
    case "intermediate":
      return "⚔️";
    case "advanced":
      return "🏆";
    default:
      return "💡";
  }
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
