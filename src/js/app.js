// ── State ──────────────────────────────────────────────────────────────────
const state = {
  lang: "en",
  game: "base",
  tab: "cards",
  data: null,
};

// ── Game → cover image map ─────────────────────────────────────────────────
const GAME_IMAGE = {
  base: "src/assets/images/basic/catan.png",
  seafarers: "src/assets/images/seafarers/catan-seafarers.png",
  "cities-knights":
    "src/assets/images/cities-and-knights/catan-cities-and-knights.png",
  "traders-barbarians":
    "src/assets/images/traders-and-barbarians/catan-traders-and-barbarians.png",
  "explorers-pirates":
    "src/assets/images/explorers-and-pirates/catan-explorers-and-pirates.png",
};

// ── Game → theme colour map ────────────────────────────────────────────────
const GAME_THEME = {
  base: {
    header: "linear-gradient(160deg, #922b21 0%, #c0392b 40%, #a93226 100%)",
    body: "#f5e6c8",
    sandDk: "#e8d0a0",
    tabActive: "#c0392b",
  },
  seafarers: {
    header: "linear-gradient(160deg, #077ead 0%, #09a4da 40%, #0690c2 100%)",
    body: "#e2f4fb",
    sandDk: "#c0e4f3",
    tabActive: "#09a4da",
  },
  "cities-knights": {
    header: "linear-gradient(160deg, #b06a2a 0%, #d38441 40%, #c47735 100%)",
    body: "#faf0e3",
    sandDk: "#f0dcc2",
    tabActive: "#d38441",
  },
  "traders-barbarians": {
    header: "linear-gradient(160deg, #711e63 0%, #92257b 40%, #832070 100%)",
    body: "#f5e4f2",
    sandDk: "#e6c8e0",
    tabActive: "#92257b",
  },
  "explorers-pirates": {
    header: "linear-gradient(160deg, #3a4d63 0%, #4c5f76 40%, #435569 100%)",
    body: "#e6ebf0",
    sandDk: "#cdd5de",
    tabActive: "#4c5f76",
  },
};

const SUPPORTED_LANGS = ["en", "es", "pt", "el"];
const DATA_PATH = "src/data/";

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("catan-lang");
  const savedGame = localStorage.getItem("catan-game");

  const langSelect = document.getElementById("lang-select");
  if (savedLang && SUPPORTED_LANGS.includes(savedLang)) {
    langSelect.value = savedLang;
    state.lang = savedLang;
  }

  langSelect.addEventListener("change", (e) => {
    state.lang = e.target.value;
    localStorage.setItem("catan-lang", state.lang);
    loadData();
  });

  document.getElementById("game-select").addEventListener("change", (e) => {
    state.game = e.target.value;
    localStorage.setItem("catan-game", state.game);
    renderGame();
  });

  // Tab switching
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tab")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.tab = btn.dataset.tab;
      localStorage.setItem("catan-tab", state.tab);
      renderGame();
    });
  });

  if (savedGame) state.game = savedGame;

  const savedTab = localStorage.getItem("catan-tab");
  if (savedTab && ["cards", "gameplay"].includes(savedTab)) {
    state.tab = savedTab;
    document
      .querySelectorAll(".tab")
      .forEach((b) => b.classList.remove("active"));
    const activeBtn = document.querySelector(`.tab[data-tab="${savedTab}"]`);
    if (activeBtn) activeBtn.classList.add("active");
  }

  loadData();
});

// Sticky tabs: toggle .stuck when tabs reach top during scroll
(function initStickyTabs() {
  const tabs = document.getElementById("tabs");
  if (!tabs) return;

  let tabsTop = tabs.getBoundingClientRect().top + window.scrollY;

  function onScroll() {
    if (window.scrollY >= tabsTop) tabs.classList.add("stuck");
    else tabs.classList.remove("stuck");
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    tabsTop = tabs.getBoundingClientRect().top + window.scrollY;
    onScroll();
  });

  // Initial check in case page is restored scrolled
  setTimeout(onScroll, 0);
})();

// ── Data Loading ───────────────────────────────────────────────────────────
async function loadData() {
  showLoading(true);
  const url = `${DATA_PATH}${state.lang}.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
  } catch {
    // Fallback to English
    try {
      const res = await fetch(`${DATA_PATH}en.json`);
      state.data = await res.json();
    } catch (err) {
      showError("Could not load cheatsheet data.");
      return;
    }
  }

  populateGameSelector();
  renderUI();
  showLoading(false);
}

// ── UI Population ──────────────────────────────────────────────────────────
function populateGameSelector() {
  const sel = document.getElementById("game-select");
  const ui = state.data.ui;
  const prev = state.game;

  sel.innerHTML = "";
  Object.entries(state.data.games).forEach(([id, game]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = game.name;
    sel.appendChild(opt);
  });

  // Restore previously selected game if available
  if (state.data.games[prev]) {
    sel.value = prev;
    state.game = prev;
  } else {
    state.game = sel.value;
  }

  // Update UI text labels
  document.getElementById("label-game").textContent = ui.labelGame;
  document.getElementById("label-lang").textContent = ui.labelLang;
  document.getElementById("app-subtitle").textContent = ui.subtitle;
  document.getElementById("footer-text").textContent = ui.footer;

  // Update tab labels
  const tabCards = document.getElementById("tab-cards");
  const tabGameplay = document.getElementById("tab-gameplay");
  if (tabCards) tabCards.textContent = `🃏 ${ui.tabCards || "Cards"}`;
  if (tabGameplay)
    tabGameplay.textContent = `🎲 ${ui.tabGameplay || "Gameplay"}`;
}

function renderUI() {
  renderGame();
}

function updateGameBanner(gameId) {
  const wrap = document.getElementById("game-banner-wrap");
  const img = document.getElementById("game-banner");
  const src = GAME_IMAGE[gameId] || GAME_IMAGE["base"];

  img.onerror = () => {
    wrap.style.display = "none";
  };
  img.onload = () => {
    wrap.style.display = "";
  };
  img.alt = gameId;
  img.src = src;

  applyGameTheme(gameId);
}

function applyGameTheme(gameId) {
  const theme = GAME_THEME[gameId] || GAME_THEME["base"];
  const root = document.documentElement;

  document.querySelector("header").style.background = theme.header;
  root.style.setProperty("--sand", theme.body);
  root.style.setProperty("--sand-dk", theme.sandDk);

  // Update tab active accent
  root.style.setProperty("--theme-accent", theme.tabActive);
}

function renderGame() {
  const game = state.data.games[state.game];
  if (!game) return;

  updateGameBanner(state.game);

  if (state.tab === "gameplay") {
    renderGameplay(game);
  } else {
    renderCards(game);
  }
}

function renderCards(game) {
  const main = document.getElementById("content");
  main.innerHTML = "";

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

  // Sections
  const collapsibleSections = new Set([
    "resources",
    "development",
    "special",
    "building-costs",
  ]);
  game.sections.forEach((section) => {
    // If this section should be collapsible, render as a <details>
    if (collapsibleSections.has(section.id)) {
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

      // Subcategory-based section (collapsible groups)
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
          sub.cards.forEach((card) => {
            grid.appendChild(buildCard(card));
          });
          details.appendChild(grid);
          detailsRoot.appendChild(details);
        });
      } else {
        // Flat card list
        const grid = document.createElement("div");
        grid.className = "card-grid";

        (section.cards || []).forEach((card) => {
          grid.appendChild(buildCard(card));
        });

        detailsRoot.appendChild(grid);
      }
      main.appendChild(detailsRoot);
    } else {
      // Non-collapsible section (existing behavior)
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
          sub.cards.forEach((card) => {
            grid.appendChild(buildCard(card));
          });
          details.appendChild(grid);
          sectionEl.appendChild(details);
        });
      } else {
        const grid = document.createElement("div");
        grid.className = "card-grid";
        (section.cards || []).forEach((card) => {
          grid.appendChild(buildCard(card));
        });
        sectionEl.appendChild(grid);
      }

      main.appendChild(sectionEl);
    }
  });
  // Initialize accordion behavior for rendered sections
  initAccordions();
}

// ── Gameplay Renderer ──────────────────────────────────────────────────────
function renderGameplay(game) {
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

  // Setup section
  if (gp.setup && gp.setup.length) {
    renderRuleSection(
      main,
      state.data.ui.titleSetup || "Setup",
      "⚙️",
      gp.setup,
      { collapsible: true },
    );
  }

  // Turn overview
  if (gp.turnOverview && gp.turnOverview.length) {
    renderRuleSection(
      main,
      state.data.ui.titleTurn || "Turn Overview",
      "🔄",
      gp.turnOverview,
      { collapsible: true },
    );
  }

  // Key rules
  if (gp.keyRules && gp.keyRules.length) {
    renderRuleSection(
      main,
      state.data.ui.titleRules || "Key Rules",
      "📜",
      gp.keyRules,
      { collapsible: true },
    );
  }

  // Special rules
  if (gp.specialRules && gp.specialRules.length) {
    renderRuleSection(
      main,
      state.data.ui.titleSpecial || "Special Rules",
      "⚡",
      gp.specialRules,
    );
  }

  // Scenarios / Variants
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

    detailsRoot.appendChild(grid);
    main.appendChild(detailsRoot);
  }

  // Initialize accordion behavior for rendered gameplay sections
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

    rules.forEach((rule) => {
      const li = document.createElement("li");
      li.className = "rule-item";
      if (typeof rule === "string") {
        li.textContent = rule;
      } else {
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
      }
      ul.appendChild(li);
    });

    sec.appendChild(ul);
    parent.appendChild(sec);
    return;
  }

  // Collapsible variant
  const details = document.createElement("details");
  details.className = "gameplay-collapsible subcategory-collapsible";
  details.open = false;

  const summary = document.createElement("summary");
  summary.className = "subcategory-summary";
  summary.innerHTML = `${icon} ${title} <span class="subcategory-count">${rules.length} items</span>`;
  details.appendChild(summary);

  const ul = document.createElement("ul");
  ul.className = "rule-list";

  rules.forEach((rule) => {
    const li = document.createElement("li");
    li.className = "rule-item";
    if (typeof rule === "string") {
      li.textContent = rule;
    } else {
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
    }
    ul.appendChild(li);
  });

  details.appendChild(ul);
  parent.appendChild(details);
}

// Accordion initializer: ensure only one details in each group is open at a time
function initAccordions() {
  const groups = [".section-collapsible", ".gameplay-collapsible"];
  groups.forEach((selector) => {
    const items = Array.from(document.querySelectorAll(selector));
    if (!items.length) return;
    items.forEach((item) => {
      // remove previous handler if present
      if (item._accordionHandler)
        item.removeEventListener("toggle", item._accordionHandler);
      const handler = () => {
        if (!item.open) return;
        items.forEach((other) => {
          if (other !== item) other.open = false;
        });
      };
      item.addEventListener("toggle", handler);
      item._accordionHandler = handler;
    });
  });
}

// ── Card Builder ───────────────────────────────────────────────────────────
function buildCard(card) {
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

// ── Helpers ────────────────────────────────────────────────────────────────
function showLoading(visible) {
  let el = document.getElementById("loading-indicator");
  if (!el) {
    el = document.createElement("div");
    el.id = "loading-indicator";
    el.className = "loading";
    document.getElementById("content").prepend(el);
  }
  el.style.display = visible ? "block" : "none";
}

function showError(msg) {
  const main = document.getElementById("content");
  main.innerHTML = `<div class="loading" style="color:#c0392b;">${msg}</div>`;
}
