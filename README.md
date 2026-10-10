# [🏝️ Catan Cheatsheet](./index.html)

A lightweight, browser-based reference for Catan card explanations — supports multiple games and languages.

> **⚠️ Legal Notice:** This is an independent community project. CATAN® and all related marks are trademarks of Catan GmbH & Co. KG and Catan Studio Inc. This project is **not** affiliated with, endorsed by, or connected to Catan GmbH, Catan Studio, or any official Catan entity. See [DISCLAIMER.md](./DISCLAIMER.md) for full details.

[![Donate](https://img.shields.io/badge/Donate-PayPal-00457C?logo=paypal)](https://www.paypal.com/donate/?hosted_button_id=VJVL67LPK7JTG)

## Features

- **Games / Expansions**: Base Catan, Seafarers, Cities & Knights, Traders & Barbarians, Explorers & Pirates
- **Languages**: English, Greek (Ελληνικά), Spanish (Español), Dutch (Nederlands), Portuguese (Português, European)
- **Six tabs**: 🃏 Cards, 🎲 Gameplay, 📋 Reference (building costs / dice probabilities / trading ratios / turn flow), 🧠 Strategy (beginner → advanced tips per game), 🎓 Learn (card finder across all languages, rules people get wrong, rules quiz, placement trainer), 🧮 Tools (dice odds calculator, starting-spot helper, robber 7-timer)
- Selections are remembered across sessions via `localStorage` (`catan-lang`, `catan-game`, `catan-tab`)
- Pure HTML + CSS + vanilla JavaScript ES modules — no build step needed
- Accessible: `role="tablist"` tabs with arrow-key navigation, `aria-live` content region, `prefers-reduced-motion`-aware animations

## Project Structure

```
index.html              # Main page (root)
src/
├── css/
│   ├── styles.css      # Styles (earthy Catan colour palette)
│   └── learn.css       # Learn tab styles
├── js/
│   ├── app.js          # Thin bootstrapper wiring modules together
│   └── modules/        # ES modules (split per responsibility)
│       ├── state.js            # Central app state
│       ├── constants.js        # Game maps, theme, localStorage keys
│       ├── storage.js          # localStorage wrapper
│       ├── data-loader.js      # Fetch + EN fallback for missing keys
│       ├── theme.js            # Per-game theming / banner
│       ├── tabs.js             # Tab switching + sticky tabs + a11y
│       ├── accordions.js       # Single-open accordion animation
│       ├── render-cards.js     # Cards tab
│       ├── render-gameplay.js  # Gameplay tab
│       ├── render-reference.js # Reference tab (📋)
│       ├── render-strategy.js  # Strategy tab (🧠)
│       ├── render-learn.js     # Learn tab (🎓)
│       ├── render-tools.js     # Tools tab (🧮)
│       ├── learn/              # Learn tab: card finder, quiz, board trainer (+ views)
│       └── tools/
│           ├── dice-odds.js    # Probability calculator
│           ├── starting-spot.js# Heuristic spot scorer
│           └── robber-timer.js # 7-frequency tracker
├── data/
│   ├── en.json         # English (canonical)
│   ├── el.json         # Greek
│   ├── es.json         # Spanish
│   ├── nl.json         # Dutch
│   └── pt.json         # Portuguese (European)
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
2. **Rename** it clearly, using lowercase and hyphens (e.g. `ore-card.webp`, `robber-token.webp`)
3. **Drop** it into the correct expansion folder
4. **Reference** it in `index.html` or inside a card definition:
   ```html
   <img src="src/assets/images/basic/ore-card.webp" alt="Ore card" />
   ```
   Or inside a JSON card entry:
   ```json
   "image": "src/assets/images/seafarers/ship.webp"
   ```

### Naming conventions

- Use lowercase letters, numbers and hyphens only — no spaces
- Prefer descriptive names: `knight-card.webp` over `img1.webp`
- Use `.webp` (small files, supports transparency). Keep images close to their display size — card art is shown at most 170px tall, so ~510px tall is plenty (existing cards are ~30 KB each); a 600 KB PNG per card makes the site slow on phones

## Adding a New Language

1. Copy `src/data/en.json` to `src/data/<code>.json` (e.g. `it.json`). `en.json` is the canonical source of truth.
2. Translate all human-readable strings: `name`, `description`, `usages`, `ui` labels, etc. Keep `id`, `type`, and image paths unchanged.
3. Update the `ui` block with translated labels.
4. Add the language option in `index.html`:
   ```html
   <option value="it">🇮🇹 Italiano</option>
   ```
5. Add the code to `SUPPORTED_LANGS` in `src/js/modules/constants.js`.

Every language file mirrors the structure of `en.json` (same keys, same array
items, same `id`s); only the human-readable text differs.

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
Tags are shown as `#hashtags`, so translate them in each language file.

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

After editing the data files, validate JSON quickly:

```bash
# using jq to check JSON validity
for f in src/data/*.json; do jq . "$f" > /dev/null || echo "Invalid JSON: $f"; done

# show git diff of changes
git --no-pager diff -- src/data/
```

## Tests

The Learn tab's logic (card search, quiz generation, board generation and scoring)
is plain ES modules with unit tests using Node's built-in runner — no install needed:

```bash
node --test 'tests/**/*.test.mjs'
```

_Community reference — not affiliated with Catan Studio. See [DISCLAIMER.md](./DISCLAIMER.md) for full legal notice._

## Support This Project

If you find this cheatsheet helpful, consider supporting its continued development via **[PayPal](https://www.paypal.com/donate/?hosted_button_id=VJVL67LPK7JTG)**. Donations help keep the project maintained and expanded with new languages and expansions.
