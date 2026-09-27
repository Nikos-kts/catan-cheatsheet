import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DISC_NUMBERS,
  HEX_COORDS,
  generateBoard,
  buildCorners,
  scoreCorner,
  rankCorners,
  bestSpots,
} from "../src/js/modules/learn/board.js";
import { createRng } from "../src/js/modules/learn/random.js";

const key = (q, r) => `${q},${r}`;

test("board has the 19 base-game hexes with the official resource mix", () => {
  const board = generateBoard(createRng(1));
  const counts = {};
  board.hexes.forEach((h) => (counts[h.res] = (counts[h.res] || 0) + 1));
  assert.equal(board.hexes.length, 19);
  assert.deepEqual(counts, { lumber: 4, wool: 4, grain: 4, brick: 3, ore: 3, desert: 1 });
});

test("every non-desert hex gets exactly one official number disc", () => {
  const board = generateBoard(createRng(7));
  const nums = board.hexes.filter((h) => h.res !== "desert").map((h) => h.num).sort((a, b) => a - b);
  assert.deepEqual(nums, [...DISC_NUMBERS].sort((a, b) => a - b));
  assert.equal(board.hexes.find((h) => h.res === "desert").num, null);
});

test("discs follow the rulebook's variable-setup spiral (rulebook p.11 example)", () => {
  // Rulebook example: start at the north-east corner, desert just below-right of centre.
  const resources = HEX_COORDS.map(([q, r]) => (q === 0 && r === 1 ? "desert" : "grain"));
  const board = generateBoard(createRng(3), { startCorner: 1, resources });
  const at = Object.fromEntries(board.hexes.map((h) => [key(h.q, h.r), h.num]));
  const expected = {
    "2,-2": 5, "1,-2": 2, "0,-2": 6, "-1,-1": 3, "-2,0": 8, "-2,1": 10, "-2,2": 9,
    "-1,2": 12, "0,2": 11, "1,1": 4, "2,0": 8, "2,-1": 10, "1,-1": 9, "0,-1": 4,
    "-1,0": 5, "-1,1": 6, "1,0": 3, "0,0": 11, "0,1": null,
  };
  assert.deepEqual(at, expected);
});

test("the same seed always builds the same board", () => {
  assert.deepEqual(generateBoard(createRng(42)), generateBoard(createRng(42)));
});

test("a 19-hex board has 54 corners, each touching 1-3 hexes", () => {
  const corners = buildCorners(generateBoard(createRng(5)));
  assert.equal(corners.length, 54);
  assert.equal(corners.reduce((n, c) => n + c.hexes.length, 0), 19 * 6);
  assert.ok(corners.every((c) => c.hexes.length >= 1 && c.hexes.length <= 3));
});

test("corner adjacency is symmetric and every corner has 2-3 neighbours", () => {
  const corners = buildCorners(generateBoard(createRng(5)));
  corners.forEach((c) => {
    assert.ok(c.neighbors.length >= 2 && c.neighbors.length <= 3, `corner ${c.id}`);
    c.neighbors.forEach((n) => assert.ok(corners[n].neighbors.includes(c.id)));
  });
});

test("corner score sums pips with the Tools-tab diversity bonus", () => {
  const hexes = [{ res: "ore", num: 6 }, { res: "grain", num: 8 }, { res: "wool", num: 5 }];
  const s = scoreCorner(hexes);
  assert.equal(s.pips, 14);
  assert.equal(Number(s.total.toFixed(2)), 16.8);
});

test("corners are ranked best-first", () => {
  const ranked = rankCorners(generateBoard(createRng(9)));
  for (let i = 1; i < ranked.length; i++) {
    assert.ok(ranked[i - 1].score.total >= ranked[i].score.total);
  }
});

test("best spots respect the distance rule", () => {
  const board = generateBoard(createRng(11));
  const corners = buildCorners(board);
  const best = bestSpots(board, 3);
  assert.equal(best.length, 3);
  best.forEach((a) => best.forEach((b) => {
    if (a.id !== b.id) assert.ok(!corners[a.id].neighbors.includes(b.id));
  }));
});

test("coastal corners count missing sea hexes like the Tools-tab helper (−2 each)", () => {
  const ranked = rankCorners(generateBoard(createRng(13)));
  ranked.forEach((c) => assert.equal(c.hexes.length, 3, "every corner lists 3 hexes (land or sea)"));
  const coast = ranked.find((c) => c.hexes.filter((h) => h.res === "water").length === 2 && c.hexes.some((h) => h.num));
  const land = coast.hexes.find((h) => h.res !== "water");
  assert.equal(coast.score.total, coast.score.pips - 4);
  assert.ok(land.num);
});
