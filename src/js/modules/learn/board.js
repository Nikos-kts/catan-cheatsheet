// Base-game board model for the placement trainer. Boards are built exactly like
// the rulebook's Variable Setup: hexes placed at random, then number discs A–R
// laid counterclockwise from a corner, spiralling inward and skipping the desert.
// Corners are scored with the same heuristic as the Tools-tab starting-spot helper.

import { score } from "../tools/starting-spot.js";
import { shuffle } from "./random.js";

// Number discs A–R in alphabetical order (CATAN rulebook 2025, p. 11).
export const DISC_NUMBERS = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

const RESOURCE_MIX = [
  ...Array(4).fill("lumber"),
  ...Array(4).fill("wool"),
  ...Array(4).fill("grain"),
  ...Array(3).fill("brick"),
  ...Array(3).fill("ore"),
  "desert",
];

const RADIUS = 2;
const SQRT3 = Math.sqrt(3);

// Axial directions for pointy-top hexes, counterclockwise on screen (y grows downward):
// east, north-east, north-west, west, south-west, south-east.
const DIRECTIONS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

// All 19 land hexes, row by row from the top.
export const HEX_COORDS = (() => {
  const coords = [];
  for (let r = -RADIUS; r <= RADIUS; r++) {
    for (let q = -RADIUS; q <= RADIUS; q++) {
      if (Math.abs(q + r) <= RADIUS) coords.push([q, r]);
    }
  }
  return coords;
})();

function ring(radius, startCorner) {
  if (radius === 0) return [[0, 0]];
  let [q, r] = DIRECTIONS[startCorner].map((d) => d * radius);
  const cells = [];
  for (let side = 0; side < 6; side++) {
    const [dq, dr] = DIRECTIONS[(startCorner + 2 + side) % 6];
    for (let step = 0; step < radius; step++) {
      cells.push([q, r]);
      q += dq;
      r += dr;
    }
  }
  return cells;
}

function spiral(startCorner) {
  const cells = [];
  for (let radius = RADIUS; radius >= 0; radius--) cells.push(...ring(radius, startCorner));
  return cells;
}

/**
 * Build a board. `options.startCorner` (0–5) and `options.resources` (aligned with
 * HEX_COORDS) override the random parts, which keeps tests deterministic.
 */
export function generateBoard(rng, options = {}) {
  const resources = options.resources || shuffle(RESOURCE_MIX, rng);
  const startCorner = options.startCorner ?? Math.floor(rng() * 6);

  const resByKey = new Map(HEX_COORDS.map(([q, r], i) => [`${q},${r}`, resources[i]]));
  const numByKey = new Map();
  let disc = 0;
  spiral(startCorner).forEach(([q, r]) => {
    const key = `${q},${r}`;
    if (resByKey.get(key) === "desert") return;
    numByKey.set(key, DISC_NUMBERS[disc]);
    disc += 1;
  });

  return {
    startCorner,
    hexes: HEX_COORDS.map(([q, r]) => ({
      q,
      r,
      res: resByKey.get(`${q},${r}`),
      num: numByKey.get(`${q},${r}`) ?? null,
    })),
  };
}

// Geometry in hex-size units (centre-to-corner = 1).
export function hexCenter(q, r) {
  return { x: SQRT3 * (q + r / 2), y: 1.5 * r };
}

export function hexVertices(q, r) {
  const { x, y } = hexCenter(q, r);
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return { x: x + Math.cos(angle), y: y + Math.sin(angle) };
  });
}

const pointKey = ({ x, y }) => `${Math.round(x * 1000)},${Math.round(y * 1000)}`;

/** Corners (settlement spots) with the hexes they touch and their neighbouring corners. */
export function buildCorners(board) {
  const byKey = new Map();
  const corners = [];
  board.hexes.forEach((hex, hexIndex) => {
    hexVertices(hex.q, hex.r).forEach((v) => {
      const key = pointKey(v);
      if (!byKey.has(key)) {
        byKey.set(key, corners.length);
        corners.push({ id: corners.length, x: v.x, y: v.y, hexes: [], neighbors: [] });
      }
      corners[byKey.get(key)].hexes.push(hexIndex);
    });
  });
  corners.forEach((a) => {
    corners.forEach((b) => {
      if (a.id !== b.id && Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - 1) < 1e-6) a.neighbors.push(b.id);
    });
  });
  return corners;
}

export function scoreCorner(hexes) {
  return score(hexes.map((h) => ({ res: h.res, num: h.num == null ? "-" : String(h.num) })));
}

/** Every corner with its production, best first. */
export function rankCorners(board) {
  return buildCorners(board)
    .map((c) => {
      const hexes = c.hexes.map((i) => board.hexes[i]);
      return { id: c.id, x: c.x, y: c.y, neighbors: c.neighbors, hexes, score: scoreCorner(hexes) };
    })
    .sort((a, b) => b.score.total - a.score.total || b.score.pips - a.score.pips || a.id - b.id);
}

/** Top `n` corners that could all be settled together (distance rule). */
export function bestSpots(board, n) {
  const picked = [];
  for (const corner of rankCorners(board)) {
    if (picked.length === n) break;
    const blocked = picked.some((p) => p.id === corner.id || p.neighbors.includes(corner.id));
    if (!blocked) picked.push(corner);
  }
  return picked;
}
