import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQuiz, formatCost, parseBest } from "../src/js/modules/learn/quiz.js";
import { createRng } from "../src/js/modules/learn/random.js";

const UI = {
  true: "True",
  false: "False",
  costQ: "What does {item} cost?",
  diceMostQ: "Apart from 7, which numbers are rolled most often?",
  sevenQ: "How often is a 7 rolled?",
  pipsQ: "How many dots are on the {n} disc?",
  and: "and",
  oneIn: "1 in {n}",
  diceExplain: "{n} can be rolled {ways} ways out of 36.",
  costExplain: "{item}: {cost}.",
};
const cost = (...parts) => parts.map(([resource, qty]) => ({ resource, icon: "", qty }));
const BASE = {
  reference: {
    buildingCosts: [
      { id: "road", name: "Road", cost: cost(["Lumber", 1], ["Brick", 1]) },
      { id: "settlement", name: "Settlement", cost: cost(["Lumber", 1], ["Brick", 1], ["Wool", 1], ["Grain", 1]) },
      { id: "city", name: "City", cost: cost(["Grain", 2], ["Ore", 3]) },
      { id: "dev", name: "Development Card", cost: cost(["Ore", 1], ["Grain", 1], ["Wool", 1]) },
    ],
  },
};
const mistakes = Array.from({ length: 6 }, (_, i) => ({
  id: `m${i}`, myth: `Myth ${i}`, rule: `Rule ${i}`, ref: `p. ${i}`,
}));
const GAME = { ...BASE, learn: { mistakes } };

test("a round has the requested number of well-formed questions", () => {
  const quiz = buildQuiz({ game: GAME, baseGame: BASE, ui: UI, rng: createRng(1), size: 8 });
  assert.equal(quiz.length, 8);
  quiz.forEach((q) => {
    assert.ok(q.text && q.explain);
    assert.ok(q.options.length >= 2);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length);
  });
});

test("true/false questions use the myth as false and the rule as true", () => {
  const quiz = buildQuiz({ game: GAME, baseGame: BASE, ui: UI, rng: createRng(2), size: 8 });
  const tf = quiz.filter((q) => q.type === "tf");
  assert.ok(tf.length >= 3);
  tf.forEach((q) => {
    const isMyth = q.text.startsWith("Myth");
    assert.equal(q.options[q.answer], isMyth ? "False" : "True");
    assert.match(q.explain, /^Rule \d$/);
  });
});

test("true/false answers are balanced within a round", () => {
  const tf = buildQuiz({ game: GAME, baseGame: BASE, ui: UI, rng: createRng(3), size: 8 }).filter((q) => q.type === "tf");
  const trues = tf.filter((q) => q.options[q.answer] === "True").length;
  assert.ok(Math.abs(trues - (tf.length - trues)) <= 1);
});

test("cost questions offer the real cost among distinct options", () => {
  const quiz = buildQuiz({ game: BASE, baseGame: BASE, ui: UI, rng: createRng(4), size: 8 });
  const costQs = quiz.filter((q) => q.kind === "cost");
  assert.ok(costQs.length >= 1);
  costQs.forEach((q) => {
    const item = BASE.reference.buildingCosts.find((b) => q.text.includes(b.name));
    assert.equal(q.options[q.answer], formatCost(item.cost));
    assert.equal(new Set(q.options).size, q.options.length);
  });
});

test("games without their own costs or mistakes still get a full round from the base game", () => {
  const quiz = buildQuiz({ game: { reference: {} }, baseGame: BASE, ui: UI, rng: createRng(5), size: 6 });
  assert.equal(quiz.length, 6);
  assert.ok(quiz.every((q) => q.type === "mc"));
});

test("no question repeats within a round", () => {
  const quiz = buildQuiz({ game: GAME, baseGame: BASE, ui: UI, rng: createRng(6), size: 8 });
  assert.equal(new Set(quiz.map((q) => q.text)).size, quiz.length);
});

test("the same seed produces the same round", () => {
  const a = buildQuiz({ game: GAME, baseGame: BASE, ui: UI, rng: createRng(9), size: 8 });
  const b = buildQuiz({ game: GAME, baseGame: BASE, ui: UI, rng: createRng(9), size: 8 });
  assert.deepEqual(a, b);
});

test("formatCost joins quantities and resources", () => {
  assert.equal(formatCost(cost(["Grain", 2], ["Ore", 3])), "2 Grain + 3 Ore");
});

test("every dice question type shows up across rounds", () => {
  const texts = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    buildQuiz({ game: GAME, baseGame: BASE, ui: UI, rng: createRng(seed), size: 8 })
      .filter((q) => q.kind === "dice")
      .forEach((q) => texts.add(q.text.includes("dots") ? "pips" : q.text));
  }
  assert.ok(texts.has("pips"));
  assert.ok(texts.has(UI.sevenQ));
  assert.ok(texts.has(UI.diceMostQ));
});

test("parseBest reads 'score/total' and rejects anything else", () => {
  assert.deepEqual(parseBest("6/8"), { score: 6, total: 8 });
  assert.equal(parseBest(null), null);
  assert.equal(parseBest("garbage"), null);
  assert.equal(parseBest("9/8"), null);
});
