// Applies per-game theming (header gradient, sand palette, tab accent)
// and swaps the banner image + official-rules link.

import { GAME_IMAGE, GAME_THEME, GAME_URL } from "./constants.js";

export function updateGameBanner(gameId) {
  const wrap = document.getElementById("game-banner-wrap");
  const img = document.getElementById("game-banner");
  const link = document.getElementById("game-banner-link");
  const src = GAME_IMAGE[gameId] || GAME_IMAGE["base"];

  if (img) {
    img.onerror = () => {
      if (wrap) wrap.style.display = "none";
    };
    img.onload = () => {
      if (wrap) wrap.style.display = "";
    };
    img.alt = gameId;
    img.src = src;
  }

  if (link) {
    link.href = GAME_URL[gameId] || GAME_URL["base"];
  }

  applyGameTheme(gameId);
}

export function applyGameTheme(gameId) {
  const theme = GAME_THEME[gameId] || GAME_THEME["base"];
  const root = document.documentElement;

  const header = document.querySelector("header");
  if (header) header.style.background = theme.header;
  root.style.setProperty("--sand", theme.body);
  root.style.setProperty("--sand-dk", theme.sandDk);
  root.style.setProperty("--theme-accent", theme.tabActive);
}
