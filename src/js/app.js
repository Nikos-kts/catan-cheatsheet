// Thin bootstrapper. Wires together state, storage, tabs, data loading and
// the individual tab renderers. All real logic lives in ./modules/*.

import { state } from "./modules/state.js";
import {
  SUPPORTED_LANGS,
  STORAGE_KEYS,
  VALID_TABS,
} from "./modules/constants.js";
import { getString, setString, getJSON } from "./modules/storage.js";
import { loadData } from "./modules/data-loader.js";
import { updateGameBanner } from "./modules/theme.js";
import { initTabs, syncActiveTab, initStickyTabs } from "./modules/tabs.js";
import { renderCards } from "./modules/render-cards.js";
import { renderGameplay } from "./modules/render-gameplay.js";
import { renderReference } from "./modules/render-reference.js";
import { renderStrategy } from "./modules/render-strategy.js";
import { renderTools } from "./modules/render-tools.js";

// ── Boot ────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Restore persisted preferences before wiring up listeners.
  const savedLang = getString(STORAGE_KEYS.lang);
  const savedGame = getString(STORAGE_KEYS.game);
  const savedTab = getString(STORAGE_KEYS.tab);
  const savedExtras = getJSON(STORAGE_KEYS.strategyExtras, []);
  if (Array.isArray(savedExtras)) state.strategyExtras = savedExtras;

  const langSelect = document.getElementById("lang-select");
  if (langSelect && savedLang && SUPPORTED_LANGS.includes(savedLang)) {
    langSelect.value = savedLang;
    state.lang = savedLang;
  }
  langSelect?.addEventListener("change", (e) => {
    state.lang = e.target.value;
    setString(STORAGE_KEYS.lang, state.lang);
    loadAndRender();
  });

  document.getElementById("game-select")?.addEventListener("change", (e) => {
    state.game = e.target.value;
    setString(STORAGE_KEYS.game, state.game);
    renderActiveTab();
  });

  if (savedGame) state.game = savedGame;
  if (savedTab && VALID_TABS.includes(savedTab)) state.tab = savedTab;

  initTabs(() => renderActiveTab());
  syncActiveTab();
  initStickyTabs();

  loadAndRender();
});

async function loadAndRender() {
  showLoading(true);
  try {
    state.data = await loadData(state.lang);
  } catch (err) {
    console.error(err);
    showError("Could not load cheatsheet data.");
    return;
  }
  populateGameSelector();
  renderActiveTab();
  showLoading(false);
}

// ── UI population (game selector + static label localization) ──────────────
function populateGameSelector() {
  const sel = document.getElementById("game-select");
  const ui = state.data.ui || {};
  const prev = state.game;

  if (sel) {
    sel.innerHTML = "";
    Object.entries(state.data.games || {}).forEach(([id, game]) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = game.name;
      sel.appendChild(opt);
    });

    if (state.data.games && state.data.games[prev]) {
      sel.value = prev;
      state.game = prev;
    } else {
      state.game = sel.value;
    }
  }

  setText("label-game", ui.labelGame);
  setText("label-lang", ui.labelLang);
  setText("app-subtitle", ui.subtitle);
  setText("footer-text", ui.footer);

  const tabCards = document.getElementById("tab-cards");
  const tabGameplay = document.getElementById("tab-gameplay");
  const tabReference = document.getElementById("tab-reference");
  const tabStrategy = document.getElementById("tab-strategy");
  const tabTools = document.getElementById("tab-tools");
  if (tabCards) tabCards.textContent = `🃏 ${ui.tabCards || "Cards"}`;
  if (tabGameplay)
    tabGameplay.textContent = `🎲 ${ui.tabGameplay || "Gameplay"}`;
  if (tabReference)
    tabReference.textContent = `📋 ${ui.tabReference || "Reference"}`;
  if (tabStrategy)
    tabStrategy.textContent = `🧠 ${ui.tabStrategy || "Strategy"}`;
  if (tabTools) tabTools.textContent = `🧮 ${ui.tabTools || "Tools"}`;
}

function setText(id, value) {
  if (value == null) return;
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ── Render dispatcher ──────────────────────────────────────────────────────
function renderActiveTab() {
  const game = state.data && state.data.games && state.data.games[state.game];
  if (!game) return;

  updateGameBanner(state.game);

  switch (state.tab) {
    case "gameplay":
      renderGameplay(game);
      break;
    case "reference":
      renderReference(game);
      break;
    case "strategy":
      renderStrategy(game);
      break;
    case "tools":
      renderTools(game);
      break;
    case "cards":
    default:
      renderCards(game);
      break;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function showLoading(visible) {
  const content = document.getElementById("content");
  if (!content) return;
  let el = document.getElementById("loading-indicator");
  if (!el) {
    el = document.createElement("div");
    el.id = "loading-indicator";
    el.className = "loading";
    content.prepend(el);
  }
  el.style.display = visible ? "block" : "none";
}

function showError(msg) {
  const main = document.getElementById("content");
  if (main) main.innerHTML = `<div class="loading" style="color:#c0392b;">${msg}</div>`;
}
