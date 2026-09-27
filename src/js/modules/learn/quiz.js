// Rules quiz: builds a round of questions from the selected game's data —
// true/false from "rules people get wrong", building costs and dice odds.
// Pure logic (no DOM); UI strings come from `ui` with English defaults.

import { shuffle, pick } from "./random.js";

const WAYS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
const MAX_COST_FIRST = 2;

const DEFAULTS = {
  true: "True",
  false: "False",
  and: "and",
  costQ: "{item}: what does it cost?",
  costExplain: "{item} costs {cost}.",
  diceMostQ: "Apart from 7, which numbers are rolled most often?",
  diceMostExplain: "6 and 8 can each be rolled 5 ways out of 36 — only 7 (6 ways) is more common.",
  sevenQ: "How often is a 7 rolled?",
  sevenExplain: "7 can be rolled 6 ways out of 36 — 1 roll in 6.",
  oneIn: "1 in {n}",
  pipsQ: "How many dots (pips) are printed on the {n} number disc?",
  diceExplain: "{n} can be rolled {ways} ways out of 36, so its disc shows {ways} dots.",
};

const fill = (template, vars) => String(template).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

export function formatCost(cost) {
  return cost.map((c) => `${c.qty} ${c.resource}`).join(" + ");
}

function trueFalseQuestions(mistakes, t, rng) {
  const firstTrue = rng() < 0.5;
  return shuffle(mistakes, rng).map((m, i) => {
    const isTrue = (i % 2 === 0) === firstTrue;
    return {
      type: "tf",
      kind: "rule",
      text: isTrue ? m.rule : m.myth,
      options: [t.true, t.false],
      answer: isTrue ? 0 : 1,
      explain: m.rule,
      ref: m.ref || "",
    };
  });
}

function costQuestions(items, t, rng) {
  const formatted = items.map((b) => ({ item: b, cost: formatCost(b.cost) }));
  return shuffle(formatted, rng)
    .map(({ item, cost }) => {
      const distractors = shuffle(
        [...new Set(formatted.map((f) => f.cost).filter((c) => c !== cost))],
        rng,
      ).slice(0, 3);
      if (!distractors.length) return null;
      const options = shuffle([cost, ...distractors], rng);
      return {
        type: "mc",
        kind: "cost",
        text: fill(t.costQ, { item: item.name }),
        options,
        answer: options.indexOf(cost),
        explain: fill(t.costExplain, { item: item.name, cost }),
      };
    })
    .filter(Boolean);
}

function diceQuestions(t, rng) {
  const pair = (a, b) => `${a} ${t.and} ${b}`;
  const most = shuffle([pair(6, 8), pair(5, 9), pair(4, 10), pair(2, 12)], rng);
  const seven = shuffle([6, 12, 36, 3].map((n) => fill(t.oneIn, { n })), rng);
  const n = pick([2, 3, 4, 5, 6, 8, 9, 10, 11, 12], rng);
  const pips = ["1", "2", "3", "4", "5"];
  return shuffle([
    { type: "mc", kind: "dice", text: t.diceMostQ, options: most, answer: most.indexOf(pair(6, 8)), explain: t.diceMostExplain },
    { type: "mc", kind: "dice", text: t.sevenQ, options: seven, answer: seven.indexOf(fill(t.oneIn, { n: 6 })), explain: t.sevenExplain },
    { type: "mc", kind: "dice", text: fill(t.pipsQ, { n }), options: pips, answer: WAYS[n] - 1, explain: fill(t.diceExplain, { n, ways: WAYS[n] }) },
  ], rng);
}

/** Parse a stored best score ("6/8"); anything malformed yields null. */
export function parseBest(value) {
  const m = /^(\d+)\/(\d+)$/.exec(String(value ?? ""));
  if (!m) return null;
  const [score, total] = [Number(m[1]), Number(m[2])];
  return total > 0 && score <= total ? { score, total } : null;
}

/**
 * One quiz round: about half true/false rule questions (when the game has them),
 * a couple of cost questions, then dice odds; shuffled.
 */
export function buildQuiz({ game, baseGame, ui = {}, rng, size = 8 }) {
  const t = { ...DEFAULTS, ...ui };
  const mistakes = (game && game.learn && game.learn.mistakes) || [];
  const ownCosts = game && game.reference && game.reference.buildingCosts;
  const costs = ((ownCosts && ownCosts.length ? ownCosts : baseGame && baseGame.reference && baseGame.reference.buildingCosts) || [])
    .filter((b) => b.name && Array.isArray(b.cost) && b.cost.length);

  const tf = trueFalseQuestions(mistakes, t, rng);
  const cost = costQuestions(costs, t, rng);
  const tfFirst = Math.min(tf.length, Math.ceil(size / 2));
  const ordered = [
    ...tf.slice(0, tfFirst),
    ...cost.slice(0, MAX_COST_FIRST),
    ...diceQuestions(t, rng),
    ...cost.slice(MAX_COST_FIRST),
    ...tf.slice(tfFirst),
  ];
  return shuffle(ordered.slice(0, size), rng);
}
