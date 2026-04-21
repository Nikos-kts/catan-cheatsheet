// Cards-tab renderer. Produces section/subcategory/card grids from
// state.data.games[<id>].sections, preserving the legacy Cities & Knights
// ordering and "progress-cards" non-collapsible exception.

import { state } from "./state.js";
import { initAccordions } from "./accordions.js";

export function renderCards(game) {
  const main = document.getElementById("content");
  main.innerHTML = "";

  // Game description (identical to legacy behaviour)
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

  // Allow game-specific ordering (e.g., Cities & Knights)
  let sections = Array.isArray(game.sections) ? game.sections.slice() : [];
  if (state.game === "cities-knights") {
    const desired = [
      "progress-cards",
      "city-improvements",
      "commodities",
      "barbarians",
    ];
    const byId = new Map(sections.map((s) => [s.id, s]));
    const reordered = [];
    desired.forEach((id) => {
      if (byId.has(id)) {
        reordered.push(byId.get(id));
        byId.delete(id);
      }
    });
    sections.forEach((s) => {
      if (byId.has(s.id)) reordered.push(s);
    });
    sections = reordered;
  }

  sections.forEach((section) => {
    // Exception: for Cities & Knights, render the 'progress-cards' section as non-collapsible
    if (state.game === "cities-knights" && section.id === "progress-cards") {
      const sectionEl = document.createElement("section");
      sectionEl.className = "section";

      const title = document.createElement("h2");
      title.className = "section-title";
      title.innerHTML = `${section.icon || ""} ${section.title}`;
      sectionEl.appendChild(title);

      if (section.subcategories && section.subcategories.length) {
        section.subcategories.forEach((sub) => {
          const details = document.createElement("details");
          details.className = "subcategory-collapsible";
          details.open = false;

          const summary = document.createElement("summary");
          summary.className = "subcategory-summary";
          const colorDot = sub.color
            ? `<span class="subcategory-dot" style="background:${sub.color}"></span>`
            : "";
          summary.innerHTML = `${colorDot}${sub.icon || ""} ${sub.title} <span class="subcategory-count">${sub.cards.length} cards</span>`;
          details.appendChild(summary);

          const grid = document.createElement("div");
          grid.className = "card-grid";
          sub.cards.forEach((card) => grid.appendChild(buildCard(card)));

          const body = document.createElement("div");
          body.className = "collapsible-body";
          body.appendChild(grid);
          details.appendChild(body);

          sectionEl.appendChild(details);
        });
      } else {
        const grid = document.createElement("div");
        grid.className = "card-grid";
        (section.cards || []).forEach((card) =>
          grid.appendChild(buildCard(card)),
        );
        sectionEl.appendChild(grid);
      }

      main.appendChild(sectionEl);
      return;
    }

    const detailsRoot = document.createElement("details");
    detailsRoot.className = "subcategory-collapsible section-collapsible";
    detailsRoot.open = false;

    const summaryRoot = document.createElement("summary");
    summaryRoot.className = "subcategory-summary section-summary";
    const count = section.cards
      ? section.cards.length
      : section.subcategories
        ? section.subcategories.reduce(
            (s, sc) => s + (sc.cards ? sc.cards.length : 0),
            0,
          )
        : 0;
    summaryRoot.innerHTML = `${section.icon || ""} ${section.title} <span class="subcategory-count">${count} cards</span>`;
    detailsRoot.appendChild(summaryRoot);

    if (section.subcategories && section.subcategories.length) {
      section.subcategories.forEach((sub) => {
        const details = document.createElement("details");
        details.className = "subcategory-collapsible";
        details.open = false;

        const summary = document.createElement("summary");
        summary.className = "subcategory-summary";
        const colorDot = sub.color
          ? `<span class="subcategory-dot" style="background:${sub.color}"></span>`
          : "";
        summary.innerHTML = `${colorDot}${sub.icon || ""} ${sub.title} <span class="subcategory-count">${sub.cards.length} cards</span>`;
        details.appendChild(summary);

        const grid = document.createElement("div");
        grid.className = "card-grid";
        sub.cards.forEach((card) => grid.appendChild(buildCard(card)));

        const body = document.createElement("div");
        body.className = "collapsible-body";
        body.appendChild(grid);
        details.appendChild(body);
        detailsRoot.appendChild(details);
      });
    } else {
      const grid = document.createElement("div");
      grid.className = "card-grid";
      (section.cards || []).forEach((card) =>
        grid.appendChild(buildCard(card)),
      );
      const body = document.createElement("div");
      body.className = "collapsible-body";
      body.appendChild(grid);
      detailsRoot.appendChild(body);
    }

    main.appendChild(detailsRoot);
  });

  initAccordions();
}

export function buildCard(card) {
  const el = document.createElement("div");
  el.className = `card ${card.type || ""}`;

  if (card.image) {
    const wrap = document.createElement("div");
    wrap.className = "card-thumbnail-wrap";
    const img = document.createElement("img");
    img.src = card.image;
    img.alt = card.name;
    img.className = "card-thumbnail";
    img.loading = "lazy";
    // Fallback to placeholder icon if the image fails to load.
    img.onerror = () => {
      wrap.classList.add("card-thumbnail-placeholder");
      wrap.innerHTML = "";
      const span = document.createElement("span");
      span.className = "placeholder-icon";
      span.textContent = card.icon || "🃏";
      span.setAttribute("aria-label", `Placeholder: ${card.name || "card"}`);
      wrap.appendChild(span);
    };
    wrap.appendChild(img);
    el.appendChild(wrap);
  } else if (card.image === null) {
    // Explicit null → show placeholder thumbnail
    const wrap = document.createElement("div");
    wrap.className = "card-thumbnail-wrap card-thumbnail-placeholder";
    const span = document.createElement("span");
    span.className = "placeholder-icon";
    span.textContent = card.icon || "🃏";
    wrap.appendChild(span);
    el.appendChild(wrap);
  }

  const header = document.createElement("div");
  header.className = "card-header";

  const icon = document.createElement("span");
  icon.className = "card-icon";
  icon.textContent = card.icon || "🃏";

  const name = document.createElement("span");
  name.className = "card-name";
  name.textContent = card.name;

  header.appendChild(icon);
  header.appendChild(name);

  if (card.count !== undefined) {
    const count = document.createElement("span");
    count.className = "card-count";
    count.textContent = `×${card.count}`;
    header.appendChild(count);
  }

  el.appendChild(header);

  if (card.description) {
    const desc = document.createElement("p");
    desc.className = "card-description";
    desc.textContent = card.description;
    el.appendChild(desc);
  }

  if (card.usages && card.usages.length) {
    const ul = document.createElement("ul");
    ul.className = "card-usages";
    card.usages.forEach((u) => {
      const li = document.createElement("li");
      li.textContent = u;
      ul.appendChild(li);
    });
    el.appendChild(ul);
  }

  return el;
}
