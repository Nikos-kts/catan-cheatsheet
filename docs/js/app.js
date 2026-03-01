// ── State ──────────────────────────────────────────────────────────────────
const state = {
    lang: 'en',
    game: 'base',
    data: null,
};

const SUPPORTED_LANGS = ['en', 'de', 'es', 'fr', 'el'];
const DATA_PATH = 'data/';

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('catan-lang');
    const savedGame = localStorage.getItem('catan-game');

    const langSelect = document.getElementById('lang-select');
    if (savedLang && SUPPORTED_LANGS.includes(savedLang)) {
        langSelect.value = savedLang;
        state.lang = savedLang;
    }

    langSelect.addEventListener('change', (e) => {
        state.lang = e.target.value;
        localStorage.setItem('catan-lang', state.lang);
        loadData();
    });

    document.getElementById('game-select').addEventListener('change', (e) => {
        state.game = e.target.value;
        localStorage.setItem('catan-game', state.game);
        renderGame();
    });

    if (savedGame) state.game = savedGame;

    loadData();
});

// ── Data Loading ───────────────────────────────────────────────────────────
async function loadData() {
    showLoading(true);
    const url = `${DATA_PATH}${state.lang}.json`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        state.data = await res.json();
    } catch {
        // Fallback to English
        try {
            const res = await fetch(`${DATA_PATH}en.json`);
            state.data = await res.json();
        } catch (err) {
            showError('Could not load cheatsheet data.');
            return;
        }
    }

    populateGameSelector();
    renderUI();
    showLoading(false);
}

// ── UI Population ──────────────────────────────────────────────────────────
function populateGameSelector() {
    const sel = document.getElementById('game-select');
    const ui = state.data.ui;
    const prev = state.game;

    sel.innerHTML = '';
    Object.entries(state.data.games).forEach(([id, game]) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = game.name;
        sel.appendChild(opt);
    });

    // Restore previously selected game if available
    if (state.data.games[prev]) {
        sel.value = prev;
        state.game = prev;
    } else {
        state.game = sel.value;
    }

    // Update UI text labels
    document.getElementById('label-game').textContent = ui.labelGame;
    document.getElementById('label-lang').textContent = ui.labelLang;
    document.getElementById('app-subtitle').textContent = ui.subtitle;
    document.getElementById('footer-text').textContent = ui.footer;
}

function renderUI() {
    renderGame();
}

function renderGame() {
    const game = state.data.games[state.game];
    if (!game) return;

    const main = document.getElementById('content');
    main.innerHTML = '';

    // Game description
    if (game.description) {
        const desc = document.createElement('div');
        desc.className = 'game-description';
        desc.textContent = game.description;
        main.appendChild(desc);
    }

    // Sections
    game.sections.forEach((section) => {
        const sectionEl = document.createElement('section');
        sectionEl.className = 'section';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.innerHTML = `${section.icon || ''} ${section.title}`;
        sectionEl.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'card-grid';

        section.cards.forEach((card) => {
            grid.appendChild(buildCard(card));
        });

        sectionEl.appendChild(grid);
        main.appendChild(sectionEl);
    });
}

// ── Card Builder ───────────────────────────────────────────────────────────
function buildCard(card) {
    const el = document.createElement('div');
    el.className = `card ${card.type || ''}`;

    const header = document.createElement('div');
    header.className = 'card-header';

    const icon = document.createElement('span');
    icon.className = 'card-icon';
    icon.textContent = card.icon || '🃏';

    const name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = card.name;

    header.appendChild(icon);
    header.appendChild(name);

    if (card.count !== undefined) {
        const count = document.createElement('span');
        count.className = 'card-count';
        count.textContent = `×${card.count}`;
        header.appendChild(count);
    }

    el.appendChild(header);

    if (card.description) {
        const desc = document.createElement('p');
        desc.className = 'card-description';
        desc.textContent = card.description;
        el.appendChild(desc);
    }

    if (card.usages && card.usages.length) {
        const ul = document.createElement('ul');
        ul.className = 'card-usages';
        card.usages.forEach((u) => {
            const li = document.createElement('li');
            li.textContent = u;
            ul.appendChild(li);
        });
        el.appendChild(ul);
    }

    return el;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function showLoading(visible) {
    let el = document.getElementById('loading-indicator');
    if (!el) {
        el = document.createElement('div');
        el.id = 'loading-indicator';
        el.className = 'loading';
        document.getElementById('content').prepend(el);
    }
    el.style.display = visible ? 'block' : 'none';
}

function showError(msg) {
    const main = document.getElementById('content');
    main.innerHTML = `<div class="loading" style="color:#c0392b;">${msg}</div>`;
}
