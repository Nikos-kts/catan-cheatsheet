// Card finder UI: type the name printed on a card (in any supported language) and
// see it explained in the reader's language, with its name in every language.

import { SUPPORTED_LANGS, GAME_IMAGE, GAME_THEME } from "../constants.js";
import { state } from "../state.js";
import { loadData } from "../data-loader.js";
import { activateTab } from "../tabs.js";
import { buildIndex, search } from "./card-finder.js";

const FLAGS = { en: "🇬🇧", el: "🇬🇷", es: "🇪🇸", nl: "🇳🇱", pt: "🇵🇹" };
const KIND_TAB = { card: "cards", cost: "reference", scenario: "gameplay" };
const DEBOUNCE_MS = 120;
const FLASH_MS = 2200;

let indexPromise = null; // built once per page load, shared by every mount

function loadIndex() {
  if (!indexPromise) {
    indexPromise = Promise.all(SUPPORTED_LANGS.map((lang) => loadData(lang).then((data) => [lang, data])))
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
      const hits = search(index, query);
      status.textContent = hits.length ? "" : ui.empty || "No match — try fewer letters or another spelling.";
      results.replaceChildren(...hits.map((hit) => buildResult(hit, ui)));
    } catch (err) {
      console.error("Card finder index failed:", err);
      status.textContent = ui.error || "Could not load the language files. Check your connection and try again.";
    }
  };
  input.addEventListener("focus", () => loadIndex().catch(() => {}), { once: true });
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

function openEntry(entry) {
  const select = document.getElementById("game-select");
  if (select && select.value !== entry.game) {
    select.value = entry.game;
    select.dispatchEvent(new Event("change"));
  }
  activateTab(KIND_TAB[entry.kind]);
  window.scrollTo({ top: document.getElementById("tabs")?.offsetTop || 0, behavior: "smooth" });
  if (entry.kind === "card") requestAnimationFrame(() => flashCard(entry.id));
}

function flashCard(cardId) {
  const card = document.querySelector(`#content [data-card-id="${CSS.escape(cardId)}"]`);
  if (!card) return;
  for (let node = card.parentElement; node; node = node.parentElement) {
    if (node.tagName === "DETAILS") node.open = true;
  }
  card.classList.add("card-flash");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => card.classList.remove("card-flash"), FLASH_MS);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
