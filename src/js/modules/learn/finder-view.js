// Card finder UI: type the name printed on a card (in any supported language) and
// see it explained in the reader's language, with its name in every language.

import { SUPPORTED_LANGS, GAME_IMAGE, GAME_THEME, STORAGE_KEYS } from "../constants.js";
import { state } from "../state.js";
import { loadLanguageFile } from "../data-loader.js";
import { activateTab } from "../tabs.js";
import { setString } from "../storage.js";
import { buildIndex, search } from "./card-finder.js";
import { scrollBelowTabs } from "./scroll.js";

const FLAGS = { en: "🇬🇧", el: "🇬🇷", es: "🇪🇸", nl: "🇳🇱", pt: "🇵🇹" };
const KIND_TAB = { card: "cards", cost: "reference", scenario: "gameplay" };
const DEBOUNCE_MS = 120;
const FLASH_MS = 2200;
const ACCORDION_MS = 320; // accordions.js animates max-height over 300ms
const PHONE = "(max-width: 760px)";

let indexPromise = null; // built once per page load, shared by every mount

function loadIndex() {
  if (!indexPromise) {
    indexPromise = Promise.all(SUPPORTED_LANGS.map((lang) => loadLanguageFile(lang).then((data) => [lang, data])))
      .then((pairs) => buildIndex(Object.fromEntries(pairs)))
      .catch((err) => {
        indexPromise = null; // allow a retry on the next keystroke
        throw err;
      });
  }
  return indexPromise;
}

export function mount(root, { ui }) {
  const hint = el("p", "finder-hint", `${ui.hint || "Type the name printed on the card — in any of these languages:"} ${SUPPORTED_LANGS.map((l) => FLAGS[l]).join(" ")}`);
  const input = document.createElement("input");
  input.type = "search";
  input.className = "finder-input";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("autocorrect", "off");
  input.setAttribute("enterkeyhint", "search");
  input.placeholder = ui.placeholder || "Card, building or scenario name…";
  input.setAttribute("aria-label", ui.title || "Card finder");
  const status = el("p", "finder-status", "");
  status.setAttribute("aria-live", "polite");
  const results = el("ul", "finder-results", "");
  root.append(hint, input, status, results);

  let timer = null;
  const run = async () => {
    const query = input.value;
    if (query.trim().length < 2) {
      results.replaceChildren();
      status.textContent = "";
      return;
    }
    status.textContent = ui.loading || "Loading all languages…";
    try {
      const index = await loadIndex();
      if (input.value !== query) return; // a newer keystroke is pending
      const hits = search(index, query, { preferGame: state.game, preferLang: state.lang });
      status.textContent = hits.length
        ? (ui.results || "{n} results").replace("{n}", hits.length)
        : ui.empty || "No match — try fewer letters or another spelling.";
      results.replaceChildren(...hits.map((hit) => buildResult(hit, ui)));
    } catch (err) {
      console.error("Card finder index failed:", err);
      status.textContent = ui.error || "Could not load the language files. Check your connection and try again.";
    }
  };
  input.addEventListener("focus", () => loadIndex().catch(() => {}), { once: true });
  // On phones the keyboard covers half the screen: bring the search box to the top
  // so the results stay visible above it.
  input.addEventListener("focus", () => {
    if (window.matchMedia(PHONE).matches) scrollBelowTabs(root.closest(".learn-section") || root);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur(); // dismiss the on-screen keyboard to reveal the results
  });
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(run, DEBOUNCE_MS);
  });
}

function buildResult({ entry, lang }, ui) {
  const li = el("li", "finder-result", "");
  const games = state.data.games || {};
  const theme = GAME_THEME[entry.game];
  if (theme) li.style.setProperty("--result-accent", theme.tabActive);

  if (GAME_IMAGE[entry.game]) {
    const img = document.createElement("img");
    img.className = "finder-thumb";
    img.src = GAME_IMAGE[entry.game];
    img.alt = "";
    img.loading = "lazy";
    li.appendChild(img);
  }

  const body = el("div", "finder-body", "");
  const titleRow = el("div", "finder-title-row", "");
  titleRow.append(
    el("span", "finder-name", entry.names[state.lang] || entry.names.en || entry.id),
    el("span", "finder-kind", ui[`kind_${entry.kind}`] || { card: "Card", cost: "Building", scenario: "Scenario" }[entry.kind]),
    el("span", "finder-game", (games[entry.game] && games[entry.game].name) || entry.game),
  );
  body.appendChild(titleRow);

  if (lang && lang !== state.lang) {
    body.appendChild(el("p", "finder-matched", `${ui.matched || "Matched"} ${FLAGS[lang]} ${entry.names[lang]}`));
  }
  const text = describe(entry, games[entry.game]);
  if (text) body.appendChild(el("p", "finder-desc", text));

  const names = el("div", "finder-names", "");
  names.setAttribute("aria-label", ui.namesLabel || "Name in every language");
  SUPPORTED_LANGS.filter((l) => entry.names[l]).forEach((l) => {
    const chip = el("span", `finder-name-chip${l === state.lang ? " is-current" : ""}`, `${FLAGS[l]} ${entry.names[l]}`);
    chip.lang = l;
    names.appendChild(chip);
  });
  body.appendChild(names);
  li.appendChild(body);

  const open = el("button", "finder-open", `${ui.open || "Open"} ›`);
  open.type = "button";
  open.addEventListener("click", () => openEntry(entry));
  li.appendChild(open);
  return li;
}

function describe(entry, game) {
  if (!game) return "";
  if (entry.kind === "card") {
    const card = allCards(game).find((c) => c.id === entry.id);
    return card ? card.description || "" : "";
  }
  if (entry.kind === "cost") {
    const item = ((game.reference && game.reference.buildingCosts) || []).find((b) => b.id === entry.id);
    return item ? (item.cost || []).map((c) => `${c.qty}× ${c.icon || ""} ${c.resource}`).join("  ·  ") : "";
  }
  const index = Number(entry.id.replace("scenario-", ""));
  const scenario = ((game.gameplay && game.gameplay.scenarios) || [])[index];
  return scenario ? scenario.description || "" : "";
}

function allCards(game) {
  return (game.sections || []).flatMap((s) => [
    ...(s.cards || []),
    ...(s.subcategories || []).flatMap((sub) => sub.cards || []),
  ]);
}

// Switch game + tab directly (no "change" event, so the Learn tab isn't rebuilt first),
// then reveal the matching item.
function openEntry(entry) {
  const select = document.getElementById("game-select");
  if (select && state.game !== entry.game) {
    select.value = entry.game;
    state.game = entry.game;
    setString(STORAGE_KEYS.game, entry.game);
  }
  activateTab(KIND_TAB[entry.kind]);
  const selector = {
    card: `[data-card-id="${CSS.escape(entry.id)}"]`,
    cost: `[data-ref-id="${CSS.escape(entry.id)}"]`,
    scenario: `[data-scenario-index="${entry.id.replace("scenario-", "")}"]`,
  }[entry.kind];
  const target = document.querySelector(`#content ${selector}`);
  if (target) reveal(target);
  else scrollBelowTabs(document.getElementById("content"));
}

function reveal(target) {
  let opened = false;
  for (let node = target.parentElement; node; node = node.parentElement) {
    if (node.tagName === "DETAILS" && !node.open) {
      node.open = true;
      opened = true;
    }
  }
  // Let the accordion finish its height animation (and its own scroll) first.
  setTimeout(() => {
    scrollBelowTabs(target, true);
    target.classList.add("learn-flash");
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    setTimeout(() => target.classList.remove("learn-flash"), FLASH_MS);
  }, opened ? ACCORDION_MS : 0);
}


function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
