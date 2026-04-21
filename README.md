# [🏝️ Catan Cheatsheet](./index.html)

A lightweight, browser-based reference for Catan card explanations — supports multiple games and languages.

> **⚠️ Legal Notice:** This is an independent community project. CATAN® and all related marks are trademarks of Catan GmbH & Co. KG and Catan Studio Inc. This project is **not** affiliated with, endorsed by, or connected to Catan GmbH, Catan Studio, or any official Catan entity. See [DISCLAIMER.md](./DISCLAIMER.md) for full details.

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github-sponsors)](https://github.com/sponsors/Nikos-kts)

## Features

- **Games / Expansions**: Base Catan, Seafarers, Cities & Knights, Traders & Barbarians, Explorers & Pirates
- **Languages**: English, German (Deutsch), Spanish (Español), French (Français), Greek (Ελληνικά), Dutch (Nederlands), Portuguese (Português)
- **Five tabs**: 🃏 Cards, 🎲 Gameplay, 📋 Reference (building costs / dice probabilities / trading ratios / turn flow), 🧠 Strategy (beginner → advanced tips with per-expansion overlays), 🧮 Tools (dice odds calculator, starting-spot helper, robber 7-timer)
- Selections are remembered across sessions via `localStorage` (`catan-lang`, `catan-game`, `catan-tab`, `catan-strategy-extras`)
- Pure HTML + CSS + vanilla JavaScript ES modules — no build step needed
- Accessible: `role="tablist"` tabs with arrow-key navigation, `aria-live` content region, `prefers-reduced-motion`-aware animations

## Project Structure

```
index.html              # Main page (root)
src/
├── css/
│   └── styles.css      # Styles (earthy Catan colour palette)
├── js/
│   ├── app.js          # Thin bootstrapper wiring modules together
│   └── modules/        # ES modules (split per responsibility)
│       ├── state.js            # Central state + pub/sub
│       ├── constants.js        # Game maps, theme, localStorage keys
│       ├── storage.js          # localStorage wrapper
│       ├── data-loader.js      # Fetch + EN fallback for missing keys
│       ├── theme.js            # Per-game theming / banner
│       ├── tabs.js             # Tab switching + sticky tabs + a11y
│       ├── accordions.js       # Single-open accordion animation
│       ├── image.js            # buildImage() placeholder helper
│       ├── render-cards.js     # Cards tab
│       ├── render-gameplay.js  # Gameplay tab
│       ├── render-reference.js # Reference tab (📋)
│       ├── render-strategy.js  # Strategy tab (🧠)
│       ├── render-tools.js     # Tools tab (🧮)
│       └── tools/
│           ├── dice-odds.js    # Probability calculator
│           ├── starting-spot.js# Heuristic spot scorer
│           └── robber-timer.js # 7-frequency tracker
├── data/
│   ├── en.json         # English (canonical)
│   ├── de.json         # German
│   ├── es.json         # Spanish
│   ├── fr.json         # French
│   ├── el.json         # Greek
│   ├── nl.json         # Dutch
│   └── pt.json         # Portuguese
└── assets/
    └── images/
        ├── basic/                    # Base Catan images
        ├── seafarers/                # Seafarers expansion images
        ├── traders-and-barbarians/   # Traders & Barbarians expansion images
        ├── cities-and-knights/       # Cities & Knights expansion images
        └── explorers-and-pirates/    # Explorers & Pirates expansion images
```

> **Note on ES modules + `file://`:** the app loads ES modules and JSON via
> `fetch()`, which most browsers block on the `file://` protocol. Open the site
> via a local HTTP server (`npx serve .` or `python3 -m http.server`) or via
> GitHub Pages — don't double-click `index.html`.

## Running Locally (Dev Container)

This project includes a **Dev Container** configuration. Open the folder in VS Code and click **Reopen in Container** when prompted. The container will:

1. Use a Node.js 20 image
2. Install `serve` globally
3. Automatically serve the project on **port 3000** and open it in your browser

### Manual start (without dev container)

```bash
npx serve . -l 3000
# or
python3 -m http.server 3000
```

Then open [http://localhost:3000](http://localhost:3000).

## Adding Images for an Expansion

Each expansion has a dedicated folder under `src/assets/images/`. Follow this workflow when fetching and adding images:

| Expansion            | Folder                                      |
| -------------------- | ------------------------------------------- |
| Base Catan           | `src/assets/images/basic/`                  |
| Seafarers            | `src/assets/images/seafarers/`              |
| Traders & Barbarians | `src/assets/images/traders-and-barbarians/` |
| Cities & Knights     | `src/assets/images/cities-and-knights/`     |
| Explorers & Pirates  | `src/assets/images/explorers-and-pirates/`  |

### Workflow

1. **Fetch / download** the image (card art, board tile, token, etc.)
2. **Rename** it clearly, using lowercase and hyphens (e.g. `ore-card.png`, `robber-token.png`)
3. **Drop** it into the correct expansion folder
4. **Reference** it in `index.html` or inside a card definition:
   ```html
   <img src="src/assets/images/basic/ore-card.png" alt="Ore card" />
   ```
   Or inside a JSON card entry:
   ```json
   "image": "src/assets/images/seafarers/ship.png"
   ```

### Naming conventions

- Use lowercase letters, numbers and hyphens only — no spaces
- Prefer descriptive names: `knight-card.png` over `img1.png`
- Recommended formats: `.png` (transparency), `.webp` (smaller size), `.jpg` (photos)

## Adding a New Language

1. Copy `src/data/en.json` to `src/data/<code>.json` (e.g. `it.json`). `en.json` is the canonical source of truth.
2. Translate all human-readable strings: `name`, `description`, `usages`, `ui` labels, etc. Keep `id`, `type`, and image paths unchanged.
3. Update the `ui` block with translated labels.
4. Add the language option in `index.html`:
   ```html
   <option value="it">🇮🇹 Italiano</option>
   ```

### Syncing and Automation

A helper script was added at `scripts/sync-translations.js` to keep other language files in sync with `en.json` and (optionally) translate missing strings using a LibreTranslate-style endpoint.

Quick usage (from project root):

```bash
# install runtime dependency used by the script (only needed once)
npm install node-fetch@2

# structural sync only (writes changes to files)
node scripts/sync-translations.js

# sync + translate strings (requires a translation service URL and key)
TRANSLATE=true NODE_TRANSLATE_URL=<url> NODE_TRANSLATE_KEY=<key> node scripts/sync-translations.js
```

The script merges missing keys from `en.json` into each target language file, aligns array entries by `id`, and preserves non-translatable identifiers (ids, types, image paths). It also prints a warning for any game that is missing an expected top-level block (`sections`, `gameplay`, `reference`, or `strategy`). Use the `TRANSLATE` mode only with a translation provider you control.

> **Missing translations fall back gracefully:** at runtime, the app merges
> any keys still missing from a language file with the English values loaded
> from `en.json`. This means new features (e.g. the Reference and Strategy
> tabs) always render, even before translators have filled in the new keys.

## Adding a Reference Entry

The Reference tab is rendered from `games.<id>.reference` in each language's
JSON, with UI labels under `ui.reference.*`. A `reference` block can
override any of these keys (others fall back to `games.base.reference`):

| Key             | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `buildingCosts` | Array of `{ id, icon, name, vp, cost: [{ resource, icon, image, qty }], note }` |
| `trading`       | Array of `{ icon, title, ratio, detail }`                               |
| `tradingNote`   | Free-text caveat shown below the trading list (e.g. expansion-specific) |
| `turnFlow`      | Ordered array of `{ icon, title, detail }` steps                        |

Dice-probability rows are generated from a constant table inside
`render-reference.js` (same for every game).

## Adding a Strategy Tip

Strategy tips live under `games.<id>.strategy` with three level buckets:

```jsonc
"strategy": {
  "beginner":     [ { "id": "...", "icon": "🌱", "title": "...", "body": "...", "tags": ["placement"] } ],
  "intermediate": [ ... ],
  "advanced":     [ ... ]
}
```

Each tip needs `id`, `title`, and `body`; `icon` and `tags` are optional.
Tips from other expansions can be overlaid in the UI via the "Also show
strategy from:" checkboxes on the Strategy tab (persisted as
`catan-strategy-extras` in `localStorage`).

## Adding a Tool

Each tool is a self-contained ES module under `src/js/modules/tools/` that
exports a single `mount(rootEl, ui)` function. Register it by adding an entry
to the `TOOLS` array in `src/js/modules/render-tools.js`. UI labels should be
read from the passed-in `ui` object so they remain translatable; defaults
live under `ui.tools.<toolKey>` in `src/data/en.json`.

## Adding a New Game / Expansion

Add a new key under "games" in each language's JSON file following the existing structure:

```json
"my-expansion": {
  "name": "My Expansion",
  "description": "Short description...",
  "sections": [
    {
      "id": "my-section",
      "title": "Section Title",
      "icon": "🎴",
      "cards": [ ... ]
    }
  ]
}
```

## Validation

After editing or syncing translations, validate JSON quickly:

```bash
# using jq to check JSON validity
for f in src/data/*.json; do jq . "$f" > /dev/null || echo "Invalid JSON: $f"; done

# show git diff of changes
git --no-pager diff -- src/data/
```

_Community reference — not affiliated with Catan Studio. See [DISCLAIMER.md](./DISCLAIMER.md) for full legal notice._

## Support This Project

If you find this cheatsheet helpful, consider sponsoring its continued development via **[GitHub Sponsors](https://github.com/sponsors/Nikos-kts)**. Sponsorships help keep the project maintained and expanded with new languages and expansions.
