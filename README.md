# [🏝️ Catan Cheatsheet](./docs/index.html)

A simple, friendly browser-based reference for Catan card explanations — supports multiple games and languages.

## Features

- **5 Games / Expansions**: Base Catan, Seafarers, Cities & Knights, Traders & Barbarians, Explorers & Pirates
- **5 Languages**: English, German (Deutsch), Spanish (Español), French (Français), Greek (Ελληνικά)
- Selections are remembered across sessions via `localStorage`
- Pure HTML + CSS + vanilla JavaScript — no build step needed

## Project Structure

```
docs/
├── index.html          # Main page
├── css/
│   └── styles.css      # Styles (earthy Catan colour palette)
├── js/
│   └── app.js          # App logic (data loading, rendering)
└── data/
    ├── en.json         # English
    ├── de.json         # German
    ├── es.json         # Spanish
    ├── fr.json         # French
    └── el.json         # Greek
```

## Running Locally (Dev Container)

This project includes a **Dev Container** configuration. Open the folder in VS Code and click **Reopen in Container** when prompted. The container will:

1. Use a Node.js 20 image
2. Install `serve` globally
3. Automatically serve `docs/` on **port 3000** and open it in your browser

### Manual start (without dev container)

```bash
npx serve docs -l 3000
# or
python3 -m http.server 3000 --directory docs
```

Then open [http://localhost:3000](http://localhost:3000).

## Adding a New Language

1. Copy `docs/data/en.json` to `docs/data/<code>.json` (e.g. `it.json`)
2. Translate all `name`, `description`, and `usages` fields
3. Update the `ui` block with translated labels
4. Add the language option in `docs/index.html`:
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

*Community reference — not affiliated with Catan Studio.*
