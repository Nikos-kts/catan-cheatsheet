// Strategy-tab renderer (🧠). Two layouts, chosen by the data shape:
//   • Level layout (default): tips bucketed by level (beginner/intermediate/
//     advanced), shown as collapsible sections with a level pill filter.
//   • Variation layout: when game.strategy has a `groups` array, tips are
//     grouped by scenario/variant (e.g. Traders & Barbarians). Each group is a
//     collapsible section; the level pills filter tips within every group and
//     each card shows a small level chip.

import { state } from "./state.js";
import { initAccordions } from "./accordions.js";

const LEVELS = ["beginner", "intermediate", "advanced"];

export function renderStrategy(game) {
  const main = document.getElementById("content");
  main.innerHTML = "";

  const ui = (state.data.ui && state.data.ui.strategy) || {};
  const strategy = game.strategy || {};
  const variationMode = Array.isArray(strategy.groups);

  // Heading + subheading (variation layout may override the shared subheading).
  const desc = document.createElement("div");
  desc.className = "game-description";
  const title = document.createElement("div");
  title.className = "game-description-title";
  title.textContent = ui.heading || "Strategy Guide";
  desc.appendChild(title);
  const subheading = (variationMode && strategy.subheading) || ui.subheading;
  if (subheading) {
    const p = document.createElement("p");
    p.textContent = subheading;
    desc.appendChild(p);
  }
  main.appendChild(desc);

  // Level pill filter (both layouts filter by level).
  const pills = document.createElement("div");
  pills.className = "pill-bar";
  pills.setAttribute("role", "tablist");
  pills.setAttribute("aria-label", ui.filterLabel || "Filter by level");
  pills.appendChild(makePill(ui.levelAll || "All", "all", true));
  LEVELS.forEach((lvl) => {
    pills.appendChild(makePill(ui["level_" + lvl] || capitalize(lvl), lvl, false));
  });
  main.appendChild(pills);

  // Body container holding the sections; re-rendered on filter change.
  const body = document.createElement("div");
  body.className = "strategy-body";
  main.appendChild(body);

  function render(activeLevel) {
    body.innerHTML = "";
    const anyShown = variationMode
      ? renderGroups(body, strategy.groups, activeLevel, ui)
      : renderLevels(body, strategy, activeLevel, ui);

    if (!anyShown) {
      const empty = document.createElement("p");
      empty.className = "loading";
      empty.textContent = ui.empty || "No strategy tips for this selection yet.";
      body.appendChild(empty);
    }

    initAccordions();
  }

  pills.querySelectorAll(".pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      pills.querySelectorAll(".pill").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      render(btn.dataset.level);
    });
  });

  render("all");
}

// Default layout: one collapsible section per level.
function renderLevels(body, strategy, activeLevel, ui) {
  let anyShown = false;

  LEVELS.forEach((lvl) => {
    if (activeLevel !== "all" && activeLevel !== lvl) return;
    const tips = Array.isArray(strategy[lvl]) ? strategy[lvl] : [];
    if (!tips.length) return;
    anyShown = true;

    const label = ui["level_" + lvl] || capitalize(lvl);
    const section = buildSection(levelIcon(lvl), label, tips.length, ui, activeLevel === lvl);
    tips.forEach((tip) => section.list.appendChild(buildTipCard(tip, ui, false)));
    body.appendChild(section.el);
  });

  return anyShown;
}

// Variation layout: one collapsible section per scenario/variant, with the
// active level filtering the tips inside each group.
function renderGroups(body, groups, activeLevel, ui) {
  let anyShown = false;

  groups.forEach((group) => {
    const all = Array.isArray(group.tips) ? group.tips : [];
    const tips = activeLevel === "all" ? all : all.filter((t) => t.level === activeLevel);
    if (!tips.length) return;
    anyShown = true;

    const section = buildSection(group.icon || "🧩", group.name || "", tips.length, ui, false);
    tips.forEach((tip) => section.list.appendChild(buildTipCard(tip, ui, true)));
    body.appendChild(section.el);
  });

  return anyShown;
}

// Builds a collapsible <details> section and returns { el, list } so the caller
// can append cards into the list. Text is set via textContent (no innerHTML).
function buildSection(icon, label, count, ui, open) {
  const el = document.createElement("details");
  el.className = "subcategory-collapsible section-collapsible";
  el.open = open;

  const sum = document.createElement("summary");
  sum.className = "subcategory-summary section-summary";
  sum.appendChild(document.createTextNode(`${icon} ${label} `));
  const countSpan = document.createElement("span");
  countSpan.className = "subcategory-count";
  countSpan.textContent = `${count} ${ui.countTips || "tips"}`;
  sum.appendChild(countSpan);
  el.appendChild(sum);

  const list = document.createElement("div");
  list.className = "strategy-list";
  const bodyWrap = document.createElement("div");
  bodyWrap.className = "collapsible-body";
  bodyWrap.appendChild(list);
  el.appendChild(bodyWrap);

  return { el, list };
}

function buildTipCard(tip, ui, showLevel) {
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

  if (showLevel && tip.level) {
    const chip = document.createElement("span");
    chip.className = "strategy-card-level level-" + tip.level;
    chip.textContent = `${levelIcon(tip.level)} ${ui["level_" + tip.level] || capitalize(tip.level)}`;
    head.appendChild(chip);
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
