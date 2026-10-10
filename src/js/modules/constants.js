// Maps and constants shared across modules.

// Game → cover image map
export const GAME_IMAGE = {
  base: "src/assets/images/basic/catan.webp",
  seafarers: "src/assets/images/seafarers/catan-seafarers.webp",
  "cities-knights":
    "src/assets/images/cities-and-knights/catan-cities-and-knights.webp",
  "traders-barbarians":
    "src/assets/images/traders-and-barbarians/catan-traders-and-barbarians.webp",
  "explorers-pirates":
    "src/assets/images/explorers-and-pirates/catan-explorers-and-pirates.webp",
};

// Game → official rules URL map
export const GAME_URL = {
  base: "https://drive.google.com/drive/folders/1zAmbOLVscsoLbcxPWu0aMBmH930lgewP",
  seafarers:
    "https://drive.google.com/drive/folders/1S1VMNsnwsOZx7vl1vTl0QE-NKejCv5ld",
  "cities-knights":
    "https://drive.google.com/drive/folders/1xKI5W88ems41y4oH061yqicTTQdiSxtn",
  "traders-barbarians":
    "https://drive.google.com/drive/folders/196MHzXg_jWBtvR1e9YQIhsB6UfEJLZWP",
  "explorers-pirates":
    "https://drive.google.com/drive/folders/1W53p6QRB__B-bKjIOn0qyIf0nH02XMtk",
};

// Game → theme colour map (header gradient, sand palette, tab accent)
export const GAME_THEME = {
  base: {
    header: "linear-gradient(160deg, #922b21 0%, #c0392b 40%, #a93226 100%)",
    body: "#f5e6c8",
    sandDk: "#e8d0a0",
    tabActive: "#c0392b",
  },
  seafarers: {
    header: "linear-gradient(160deg, #077ead 0%, #09a4da 40%, #0690c2 100%)",
    body: "#e2f4fb",
    sandDk: "#c0e4f3",
    tabActive: "#09a4da",
  },
  "cities-knights": {
    header: "linear-gradient(160deg, #b06a2a 0%, #d38441 40%, #c47735 100%)",
    body: "#faf0e3",
    sandDk: "#f0dcc2",
    tabActive: "#d38441",
  },
  "traders-barbarians": {
    header: "linear-gradient(160deg, #711e63 0%, #92257b 40%, #832070 100%)",
    body: "#f5e4f2",
    sandDk: "#e6c8e0",
    tabActive: "#92257b",
  },
  "explorers-pirates": {
    header: "linear-gradient(160deg, #3a4d63 0%, #4c5f76 40%, #435569 100%)",
    body: "#e6ebf0",
    sandDk: "#cdd5de",
    tabActive: "#4c5f76",
  },
};

export const SUPPORTED_LANGS = ["en", "el", "es", "nl", "pt"];
export const DATA_PATH = "src/data/";

// Valid tab ids (used by storage + tab controller)
export const VALID_TABS = [
  "cards",
  "gameplay",
  "reference",
  "strategy",
  "learn",
  "tools",
];

// localStorage keys (namespaced for clarity)
export const STORAGE_KEYS = {
  lang: "catan-lang",
  game: "catan-game",
  tab: "catan-tab",
  quizBest: "catan-quiz-best",
  keepAwake: "catan-keep-awake",
};

// Donation link (same as the footer) for the "support this project" prompts.
export const SUPPORT_URL = "https://www.paypal.com/donate/?hosted_button_id=VJVL67LPK7JTG";
