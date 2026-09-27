// Learn tab: a card finder that works across every game and language, the rules
// people most often get wrong, a rules quiz and a placement trainer. Each section
// is a self-contained module exposing `mount(root, ctx)`.

import { state } from "./state.js";
import * as finder from "./learn/finder-view.js";
import * as mistakes from "./learn/mistakes-view.js";
import * as quiz from "./learn/quiz-view.js";
import * as trainer from "./learn/trainer-view.js";

const SECTIONS = [
  { id: "finder", icon: "🔎", title: "Can't read your card?", module: finder },
  { id: "mistakes", icon: "⚠️", title: "Rules people get wrong", module: mistakes },
  { id: "quiz", icon: "🧩", title: "Rules quiz", module: quiz },
  { id: "trainer", icon: "📍", title: "Placement trainer", module: trainer },
];

export function renderLearn(game) {
  const main = document.getElementById("content");
  main.replaceChildren();
  const ui = (state.data.ui && state.data.ui.learn) || {};

  main.appendChild(buildHero(ui));
  SECTIONS.forEach((section) => {
    const sectionUi = ui[section.id] || {};
    const el = document.createElement("section");
    el.className = `learn-section learn-${section.id}`;
    el.id = `learn-${section.id}`;

    const h = document.createElement("h2");
    h.className = "learn-section-title";
    h.textContent = `${section.icon} ${sectionUi.title || section.title}`;
    el.appendChild(h);

    const body = document.createElement("div");
    body.className = "learn-section-body";
    el.appendChild(body);
    main.appendChild(el);

    section.module.mount(body, { game, gameId: state.game, ui: sectionUi, learnUi: ui });
  });
}

function buildHero(ui) {
  const hero = document.createElement("div");
  hero.className = "learn-hero";

  const title = document.createElement("h1");
  title.className = "learn-hero-title";
  title.textContent = `🎓 ${ui.heading || "Learn Catan"}`;
  hero.appendChild(title);

  const intro = document.createElement("p");
  intro.className = "learn-hero-intro";
  intro.textContent =
    ui.intro ||
    "For new players and mixed-language tables: find any card, learn the rules people get wrong, test yourself and practise your opening.";
  hero.appendChild(intro);

  const nav = document.createElement("div");
  nav.className = "learn-hero-nav";
  SECTIONS.forEach((section) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "learn-chip";
    btn.textContent = `${section.icon} ${(ui[section.id] && ui[section.id].title) || section.title}`;
    btn.addEventListener("click", () =>
      document.getElementById(`learn-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    nav.appendChild(btn);
  });
  hero.appendChild(nav);
  return hero;
}
