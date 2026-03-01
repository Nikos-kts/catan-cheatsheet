# [🏝️ Catan Cheatsheet](./index.html)

A simple, friendly browser-based reference for Catan card explanations — supports multiple games and languages.

## Features

- **5 Games / Expansions**: Base Catan, Seafarers, Cities & Knights, Traders & Barbarians, Explorers & Pirates
- **5 Languages**: English, German (Deutsch), Spanish (Español), French (Français), Greek (Ελληνικά)
- Selections are remembered across sessions via `localStorage`
- Pure HTML + CSS + vanilla JavaScript — no build step needed

## Project Structure

```
index.html              # Main page (root)
src/
├── css/
│   └── styles.css      # Styles (earthy Catan colour palette)
├── js/
│   └── app.js          # App logic (data loading, rendering)
├── data/
│   ├── en.json         # English
│   ├── de.json         # German
│   ├── es.json         # Spanish
│   ├── fr.json         # French
│   └── el.json         # Greek
└── assets/
    └── images/
        ├── basic/                    # Base Catan images
        ├── seafarers/                # Seafarers expansion images
        ├── traders-and-barbarians/   # Traders & Barbarians expansion images
        ├── cities-and-knights/       # Cities & Knights expansion images
        └── explorers-and-pirates/    # Explorers & Pirates expansion images
```

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

---

## Adding a New Language

1. Copy `src/data/en.json` to `src/data/<code>.json` (e.g. `it.json`)
2. Translate all `name`, `description`, and `usages` fields
3. Update the `ui` block with translated labels
4. Add the language option in `index.html`:
   ```html
   <option value="it">🇮🇹 Italiano</option>
   ```

## Adding a New Game / Expansion

Add a new key under `"games"` in each language's JSON file following the existing structure:

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

---

_Community reference — not affiliated with Catan Studio._
