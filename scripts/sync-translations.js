// sync-translations.js
// Usage:
// 1) npm install node-fetch@2
// 2) TRANSLATE=true (optional) NODE_TRANSLATE_URL=<url> NODE_TRANSLATE_KEY=<key> node scripts/sync-translations.js

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const DATA_DIR = path.join(__dirname, "..", "src", "data");
const EN_FILE = path.join(DATA_DIR, "en.json");

const LANG_MAP = {
  "en.json": "en",
  "de.json": "de",
  "es.json": "es",
  "fr.json": "fr",
  "nl.json": "nl",
  "pt.json": "pt",
  "el.json": "el",
};

const TRANSLATE =
  process.env.TRANSLATE === "true" || process.env.TRANSLATE === "1";
const TRANSLATE_URL =
  process.env.NODE_TRANSLATE_URL || "https://libretranslate.de/translate";
const TRANSLATE_KEY = process.env.NODE_TRANSLATE_KEY || "";

async function translateText(text, target) {
  if (!TRANSLATE) return text; // skip translation by default
  if (!text || typeof text !== "string") return text;
  try {
    const body = {
      q: text,
      source: "en",
      target,
      format: "text",
    };
    if (TRANSLATE_KEY) body.api_key = TRANSLATE_KEY;
    const res = await fetch(TRANSLATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    // LibreTranslate returns { translatedText }
    if (j && j.translatedText) return j.translatedText;
    // Fallback if google style
    if (j && j.data && j.data.translations && j.data.translations[0])
      return j.data.translations[0].translatedText;
    return text;
  } catch (err) {
    console.error("Translate failed, returning English:", err && err.message);
    return text;
  }
}

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

async function translateStructure(node, lang) {
  if (typeof node === "string") return await translateText(node, lang);
  if (Array.isArray(node)) {
    const out = [];
    for (const item of node) {
      out.push(await translateStructure(item, lang));
    }
    return out;
  }
  if (isObject(node)) {
    const obj = {};
    for (const k of Object.keys(node)) {
      obj[k] = await translateStructure(node[k], lang);
    }
    return obj;
  }
  return node;
}

async function mergeEnIntoTarget(enObj, targetObj, lang) {
  // Walk keys in enObj. If missing in targetObj add translated/copy value.
  for (const key of Object.keys(enObj)) {
    const enVal = enObj[key];
    const tgtVal = targetObj[key];
    if (tgtVal === undefined) {
      // copy and translate strings inside structure
      targetObj[key] = await translateStructure(enVal, lang);
      continue;
    }
    // if both objects (non-array), recurse
    if (isObject(enVal) && isObject(tgtVal)) {
      await mergeEnIntoTarget(enVal, tgtVal, lang);
      continue;
    }
    // if arrays of objects with `id` fields (cards lists), merge by id
    if (
      Array.isArray(enVal) &&
      Array.isArray(tgtVal) &&
      enVal.length &&
      isObject(enVal[0]) &&
      enVal[0].id
    ) {
      const byId = new Map();
      for (const item of tgtVal) {
        if (isObject(item) && item.id) byId.set(item.id, item);
      }
      for (const enItem of enVal) {
        const existing = byId.get(enItem.id);
        if (existing) {
          await mergeEnIntoTarget(enItem, existing, lang);
        } else {
          // push translated copy
          const translated = await translateStructure(enItem, lang);
          tgtVal.push(translated);
        }
      }
      continue;
    }
    // types differ (e.g., en has subcategories, target has cards) -> replace target with translated enVal
    if (
      Array.isArray(enVal) !== Array.isArray(tgtVal) ||
      typeof enVal !== typeof tgtVal
    ) {
      targetObj[key] = await translateStructure(enVal, lang);
      continue;
    }
    // primitive (string/number/bool) — keep target value
    // if target is empty string and enVal is string, fill with translation
    if (typeof tgtVal === "string" && (!tgtVal || tgtVal.startsWith("TODO:"))) {
      targetObj[key] = await translateText(enVal, lang);
    }
  }
}

async function main() {
  const enRaw = fs.readFileSync(EN_FILE, "utf8");
  const enObj = JSON.parse(enRaw);

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json") && f !== "en.json");
  for (const file of files) {
    const full = path.join(DATA_DIR, file);
    const lang = LANG_MAP[file] || path.basename(file, ".json");
    console.log("Syncing", file, "-> lang", lang);
    const raw = fs.readFileSync(full, "utf8");
    const tgt = JSON.parse(raw);
    await mergeEnIntoTarget(enObj, tgt, lang);
    // write back with 2-space indent
    fs.writeFileSync(full, JSON.stringify(tgt, null, 2) + "\n", "utf8");
    console.log("Updated", file);
  }
  console.log("Done. Run a JSON linter or git diff to inspect changes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
