// Strategy-tab renderer (🧠). Shows tips for the selected game bucketed by
// level (beginner, intermediate, advanced) with a pill filter (All + per-level).

import { state } from "./state.js";
import { initAccordions } from "./accordions.js";

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

  const strategy = game.strategy || {};

  // Level pill filter
  const pills = document.createElement("div");
  pills.className = "pill-bar";
  pills.setAttribute("role", "tablist");
  pills.setAttribute("aria-label", ui.filterLabel || "Filter by level");

  pills.appendChild(makePill(ui.levelAll || "All", "all", true));
  LEVELS.forEach((lvl) => {
    const label = ui["level_" + lvl] || capitalize(lvl);
    pills.appendChild(makePill(label, lvl, false));
  });
  main.appendChild(pills);

  // Body container holding the level sections; re-rendered on filter change.
  const body = document.createElement("div");
  body.className = "strategy-body";
  main.appendChild(body);

  function renderLevels(activeLevel) {
    body.innerHTML = "";
    let anyShown = false;

    LEVELS.forEach((lvl) => {
      if (activeLevel !== "all" && activeLevel !== lvl) return;

      const tips = Array.isArray(strategy[lvl]) ? strategy[lvl] : [];
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
      tips.forEach((tip) => list.appendChild(buildTipCard(tip)));

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

function buildTipCard(tip) {
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
