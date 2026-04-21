// Gameplay-tab renderer. Extracted verbatim from the legacy app.js
// (renderGameplay + renderRuleSection), rewritten as ES module.

import { state } from "./state.js";
import { initAccordions } from "./accordions.js";

export function renderGameplay(game) {
  const gp = game.gameplay;
  const main = document.getElementById("content");
  main.innerHTML = "";

  if (!gp) {
    main.innerHTML = `<div class="loading">${state.data.ui.noGameplay || "Gameplay information coming soon."}</div>`;
    return;
  }

  // Game description
  if (game.description) {
    const desc = document.createElement("div");
    desc.className = "game-description";
    if (game.descriptionTitle) {
      const title = document.createElement("div");
      title.className = "game-description-title";
      title.textContent = game.descriptionTitle;
      desc.appendChild(title);
    }
    const text = document.createElement("p");
    text.textContent = game.description;
    desc.appendChild(text);
    main.appendChild(desc);
  }

  // Info boxes (players, VP target)
  if (gp.players || gp.vpToWin) {
    const info = document.createElement("div");
    info.className = "info-box";
    const parts = [];
    if (gp.players)
      parts.push(
        `<strong>${state.data.ui.labelPlayers || "Players"}:</strong> ${gp.players}`,
      );
    if (gp.vpToWin)
      parts.push(
        `<strong>${state.data.ui.labelVP || "Victory Points to Win"}:</strong> ${gp.vpToWin}`,
      );
    info.innerHTML = parts.join(" &nbsp;|&nbsp; ");
    main.appendChild(info);
  }

  if (gp.setup && gp.setup.length) {
    renderRuleSection(
      main,
      state.data.ui.titleSetup || "Setup",
      "⚙️",
      gp.setup,
      { collapsible: true },
    );
  }
  if (gp.turnOverview && gp.turnOverview.length) {
    renderRuleSection(
      main,
      state.data.ui.titleTurn || "Turn Overview",
      "🔄",
      gp.turnOverview,
      { collapsible: true },
    );
  }
  if (gp.keyRules && gp.keyRules.length) {
    renderRuleSection(
      main,
      state.data.ui.titleRules || "Key Rules",
      "📜",
      gp.keyRules,
      { collapsible: true },
    );
  }
  if (gp.specialRules && gp.specialRules.length) {
    renderRuleSection(
      main,
      state.data.ui.titleSpecial || "Special Rules",
      "⚡",
      gp.specialRules,
    );
  }

  if (gp.scenarios && gp.scenarios.length) {
    const detailsRoot = document.createElement("details");
    detailsRoot.className = "gameplay-collapsible subcategory-collapsible";
    detailsRoot.open = false;

    const summaryRoot = document.createElement("summary");
    summaryRoot.className = "subcategory-summary";
    summaryRoot.innerHTML = `🗺️ ${state.data.ui.titleScenarios || "Scenarios & Variants"} <span class="subcategory-count">${gp.scenarios.length} items</span>`;
    detailsRoot.appendChild(summaryRoot);

    const grid = document.createElement("div");
    grid.className = "variant-grid";

    gp.scenarios.forEach((s) => {
      const card = document.createElement("div");
      card.className = "variant-card";

      const nameRow = document.createElement("div");
      nameRow.className = "variant-name";
      nameRow.textContent = s.name;
      if (s.vp) {
        const vp = document.createElement("span");
        vp.className = "variant-vp";
        vp.textContent = s.vp;
        nameRow.appendChild(vp);
      }
      card.appendChild(nameRow);

      if (s.description) {
        const desc = document.createElement("p");
        desc.className = "variant-desc";
        desc.textContent = s.description;
        card.appendChild(desc);
      }

      if (s.details && s.details.length) {
        const ul = document.createElement("ul");
        ul.className = "variant-details";
        s.details.forEach((d) => {
          const li = document.createElement("li");
          li.textContent = d;
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }

      grid.appendChild(card);
    });

    const body = document.createElement("div");
    body.className = "collapsible-body";
    body.appendChild(grid);
    detailsRoot.appendChild(body);
    main.appendChild(detailsRoot);
  }

  initAccordions();
}

function renderRuleSection(parent, title, icon, rules, options = {}) {
  const collapsible = options.collapsible === true;

  if (!collapsible) {
    const sec = document.createElement("div");
    sec.className = "gameplay-section";
    const h = document.createElement("h2");
    h.innerHTML = `${icon} ${title}`;
    sec.appendChild(h);

    const ul = document.createElement("ul");
    ul.className = "rule-list";
    rules.forEach((rule) => ul.appendChild(buildRuleItem(rule)));
    sec.appendChild(ul);
    parent.appendChild(sec);
    return;
  }

  const details = document.createElement("details");
  details.className = "gameplay-collapsible subcategory-collapsible";
  details.open = false;

  const summary = document.createElement("summary");
  summary.className = "subcategory-summary";
  summary.innerHTML = `${icon} ${title} <span class="subcategory-count">${rules.length} items</span>`;
  details.appendChild(summary);

  const ul = document.createElement("ul");
  ul.className = "rule-list";
  rules.forEach((rule) => ul.appendChild(buildRuleItem(rule)));

  const body = document.createElement("div");
  body.className = "collapsible-body";
  body.appendChild(ul);
  details.appendChild(body);
  parent.appendChild(details);
}

function buildRuleItem(rule) {
  const li = document.createElement("li");
  li.className = "rule-item";
  if (typeof rule === "string") {
    li.textContent = rule;
    return li;
  }
  if (rule.title) {
    const t = document.createElement("div");
    t.className = "rule-title";
    t.textContent = rule.title;
    li.appendChild(t);
  }
  if (rule.images && rule.images.length) {
    const imgRow = document.createElement("div");
    imgRow.className = "rule-images";
    rule.images.forEach((img) => {
      const imgEl = document.createElement("img");
      imgEl.src = img.src;
      imgEl.alt = img.alt || "";
      imgEl.className = "rule-inline-img";
      imgEl.loading = "lazy";
      imgRow.appendChild(imgEl);
    });
    li.appendChild(imgRow);
  }
  if (rule.detail) {
    const d = document.createElement("div");
    d.className = "rule-detail";
    d.textContent = rule.detail;
    li.appendChild(d);
  }
  return li;
}
