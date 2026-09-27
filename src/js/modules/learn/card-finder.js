// Card finder: look up a card, building or scenario by the name printed on it in
// any supported language. Pure logic (no DOM) so it can be unit-tested.

const SCORE = { exact: 100, prefix: 85, wordPrefix: 75, contains: 60, fuzzy: 40 };
const MIN_QUERY = 2;
const FUZZY_MIN = 4;

/** Lower-case, strip accents/diacritics and punctuation, unify the Greek final sigma. */
export function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/ς/g, "σ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function collect(game) {
  const items = [];
  (game.sections || []).forEach((section) => {
    (section.cards || []).forEach((c) => items.push({ kind: "card", id: c.id, name: c.name }));
    (section.subcategories || []).forEach((sub) =>
      (sub.cards || []).forEach((c) => items.push({ kind: "card", id: c.id, name: c.name })),
    );
  });
  ((game.reference && game.reference.buildingCosts) || []).forEach((b) =>
    items.push({ kind: "cost", id: b.id, name: b.name }),
  );
  ((game.gameplay && game.gameplay.scenarios) || []).forEach((s, i) =>
    items.push({ kind: "scenario", id: `scenario-${i}`, name: s.name }),
  );
  return items.filter((it) => it.id && it.name);
}

/** One entry per game item, holding its name in every language. */
export function buildIndex(dataByLang) {
  const entries = new Map();
  Object.entries(dataByLang).forEach(([lang, data]) => {
    Object.entries((data && data.games) || {}).forEach(([gameId, game]) => {
      collect(game).forEach(({ kind, id, name }) => {
        const key = `${gameId}:${kind}:${id}`;
        if (!entries.has(key)) entries.set(key, { key, game: gameId, kind, id, names: {}, terms: [] });
        const entry = entries.get(key);
        entry.names[lang] = name;
        entry.terms.push({ lang, norm: normalize(name) });
      });
    });
  });
  return [...entries.values()];
}

function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function termScore(q, term) {
  if (term === q) return SCORE.exact;
  if (term.startsWith(q)) return SCORE.prefix;
  const words = term.split(" ");
  if (words.some((w) => w.startsWith(q))) return SCORE.wordPrefix;
  if (term.includes(q)) return SCORE.contains;
  if (q.length < FUZZY_MIN) return 0;
  const maxDistance = q.length >= 7 ? 2 : 1;
  const distance = Math.min(...[term, term.slice(0, q.length), ...words].map((c) => levenshtein(q, c)));
  return distance <= maxDistance ? SCORE.fuzzy - distance * 5 : 0;
}

/** Best matches first: [{ entry, score, lang }] where `lang` is the language that matched. */
export function search(index, query, { limit = 8 } = {}) {
  const q = normalize(query);
  if (q.length < MIN_QUERY) return [];
  const hits = [];
  index.forEach((entry) => {
    let best = { score: 0, lang: null };
    entry.terms.forEach(({ lang, norm }) => {
      const s = termScore(q, norm);
      if (s > best.score) best = { score: s, lang };
    });
    if (best.score > 0) hits.push({ entry, ...best });
  });
  hits.sort((a, b) => b.score - a.score || (a.entry.names.en || "").localeCompare(b.entry.names.en || ""));

  // The same building (e.g. "Road") appears in several games — keep the first one only.
  const seenCosts = new Set();
  return hits
    .filter(({ entry }) => {
      if (entry.kind !== "cost") return true;
      const key = normalize(entry.names.en || entry.id);
      if (seenCosts.has(key)) return false;
      seenCosts.add(key);
      return true;
    })
    .slice(0, limit);
}
