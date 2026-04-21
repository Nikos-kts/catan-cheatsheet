// Fetches the per-language data file, falls back to English on error, and
// fills in any missing reference/strategy/ui keys from English so new tabs
// work even for languages that have not yet been translated.

import { DATA_PATH } from "./constants.js";

let enCache = null;

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

// Deep-merge: copy any keys present in `source` that are missing (or empty
// objects) in `target`. Does NOT overwrite existing translated content.
function fillMissing(target, source) {
  if (!isObject(source)) return target;
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];
    if (tgtVal === undefined) {
      target[key] = deepClone(srcVal);
    } else if (isObject(srcVal) && isObject(tgtVal)) {
      fillMissing(tgtVal, srcVal);
    }
  }
  return target;
}

function deepClone(v) {
  if (v == null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(deepClone);
  const out = {};
  for (const k of Object.keys(v)) out[k] = deepClone(v[k]);
  return out;
}

/**
 * Loads the data file for the requested language.
 * Falls back to English for any missing keys so new features (e.g. the
 * Reference / Strategy tabs) remain populated in untranslated languages.
 */
export async function loadData(lang) {
  // Always fetch the English file once — used as fallback source.
  if (!enCache) {
    try {
      enCache = await fetchJSON(`${DATA_PATH}en.json`);
    } catch (err) {
      console.error("Could not load English fallback data:", err);
      enCache = null;
    }
  }

  if (lang === "en" || !enCache) {
    if (enCache) return deepClone(enCache);
    // Last-ditch: try fetching the requested lang directly
    return fetchJSON(`${DATA_PATH}${lang}.json`);
  }

  try {
    const primary = await fetchJSON(`${DATA_PATH}${lang}.json`);
    // Ensure new structural keys (reference, strategy, ui.reference, etc.)
    // that translators haven't filled in yet still appear in the UI.
    fillMissing(primary, enCache);
    return primary;
  } catch (err) {
    console.warn(
      `Could not load ${lang}.json, falling back to English:`,
      err && err.message,
    );
    return deepClone(enCache);
  }
}
