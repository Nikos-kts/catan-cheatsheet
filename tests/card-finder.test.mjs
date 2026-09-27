import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalize, buildIndex, search } from "../src/js/modules/learn/card-finder.js";

const card = (id, name) => ({ id, name, description: `${name} text` });
const data = (names) => ({
  games: {
    base: {
      name: names.game,
      sections: [
        { id: "dev", cards: [card("road-building", names.rb), card("monopoly", names.mono)] },
        { id: "progress", subcategories: [{ id: "sci", cards: [card("printer", names.printer)] }] },
      ],
      reference: { buildingCosts: [{ id: "road", name: names.road, cost: [] }] },
      gameplay: { scenarios: [{ name: names.scenario }] },
    },
  },
});
const FIXTURE = {
  en: data({ game: "Catan", rb: "Road Building", mono: "Monopoly", printer: "Printer", road: "Road", scenario: "The Four Islands" }),
  el: data({ game: "Κατάν", rb: "Οδοποιία", mono: "Μονοπώλιο", printer: "Τυπογράφος", road: "Δρόμος", scenario: "Τα 4 Νησιά" }),
  es: data({ game: "Catán", rb: "Construcción de Carreteras", mono: "Monopolio", printer: "Imprenta", road: "Carretera", scenario: "Las cuatro islas" }),
};

test("normalize ignores case, accents and the Greek final sigma", () => {
  assert.equal(normalize("Οικισμός"), normalize("ΟΙΚΙΣΜΟΣ"));
  assert.equal(normalize("Construcción  de   Carreteras!"), "construccion de carreteras");
});

test("index holds cards, sub-category cards, building costs and scenarios with every language's name", () => {
  const index = buildIndex(FIXTURE);
  const printer = index.find((e) => e.id === "printer");
  assert.deepEqual(printer.names, { en: "Printer", el: "Τυπογράφος", es: "Imprenta" });
  assert.ok(index.find((e) => e.kind === "cost" && e.id === "road"));
  assert.ok(index.find((e) => e.kind === "scenario" && e.names.el === "Τα 4 Νησιά"));
});

test("a card is found by the name printed in another language", () => {
  const [hit] = search(buildIndex(FIXTURE), "Οδοποιία");
  assert.equal(hit.entry.id, "road-building");
  assert.equal(hit.lang, "el");
});

test("search works without accents", () => {
  const [hit] = search(buildIndex(FIXTURE), "μονοπωλιο");
  assert.equal(hit.entry.id, "monopoly");
});

test("search tolerates a typo", () => {
  const [hit] = search(buildIndex(FIXTURE), "Monopolly");
  assert.equal(hit.entry.id, "monopoly");
});

test("an exact name ranks above a longer name containing it", () => {
  const hits = search(buildIndex(FIXTURE), "road");
  assert.equal(hits[0].entry.id, "road");
  assert.ok(hits.some((h) => h.entry.id === "road-building"));
});

test("queries shorter than 2 characters return nothing", () => {
  assert.deepEqual(search(buildIndex(FIXTURE), "r"), []);
});

test("works on the real data files: a Greek card name finds the English card", () => {
  const load = (l) => JSON.parse(readFileSync(new URL(`../src/data/${l}.json`, import.meta.url)));
  const real = Object.fromEntries(["en", "el", "es", "nl", "pt"].map((l) => [l, load(l)]));
  const index = buildIndex(real);
  const knight = index.find((e) => e.game === "base" && e.id === "knight");
  assert.ok(knight, "base knight card indexed");
  const [hit] = search(index, real.el.games.base.sections.flatMap((s) => s.cards || []).find((c) => c.id === "knight").name);
  assert.equal(hit.entry.id, "knight");
  assert.equal(hit.entry.names.en, real.en.games.base.sections.flatMap((s) => s.cards || []).find((c) => c.id === "knight").name);
});

const multiGame = {
  en: { games: {
    base: { reference: { buildingCosts: [{ id: "road", name: "Road" }] } },
    "explorers-pirates": {
      sections: [{ id: "m", cards: [{ id: "council", name: "Council of Catan" }, { id: "wonder", name: "Wonder" }] }],
      reference: { buildingCosts: [{ id: "road", name: "Road" }] },
    },
  } },
  nl: { games: {
    base: { reference: { buildingCosts: [{ id: "road", name: "Straat" }] } },
    "explorers-pirates": {
      sections: [{ id: "m", cards: [{ id: "council", name: "Raad van Catan" }, { id: "wonder", name: "Wonder" }] }],
      reference: { buildingCosts: [{ id: "road", name: "Straat" }] },
    },
  } },
};

test("a building shared by several games resolves to the reader's selected game", () => {
  const hits = search(buildIndex(multiGame), "road", { preferGame: "explorers-pirates" });
  assert.equal(hits[0].entry.game, "explorers-pirates");
  assert.equal(hits.filter((h) => h.entry.kind === "cost").length, 1);
});

test("fuzzy matches are dropped when there are real matches", () => {
  const hits = search(buildIndex(multiGame), "road");
  assert.ok(!hits.some((h) => h.entry.id === "council"), "Raad ≈ road must not show up");
});

test("when several languages match equally, the reader's language wins", () => {
  const [hit] = search(buildIndex(multiGame), "Wonder", { preferLang: "nl" });
  assert.equal(hit.lang, "nl");
});
