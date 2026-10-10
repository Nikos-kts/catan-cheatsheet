// Rules quiz UI: one round of questions with instant feedback, a score screen,
// a best score per game (localStorage) and a low-key support link.

import { state } from "../state.js";
import { STORAGE_KEYS, SUPPORT_URL } from "../constants.js";
import { getString, setString } from "../storage.js";
import { buildQuiz, parseBest } from "./quiz.js";
import { createRng } from "./random.js";
import { keepTopVisible } from "./scroll.js";

const ROUND_SIZE = 8;

const fill = (template, vars) => String(template).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
let questionSeq = 0;

export function mount(root, { game, gameId, ui }) {
  const bestKey = `${STORAGE_KEYS.quizBest}-${gameId}`;
  const card = document.createElement("div");
  card.className = "quiz-card";
  root.appendChild(card);

  const start = () => {
    const questions = buildQuiz({
      game,
      baseGame: state.data.games && state.data.games.base,
      ui,
      rng: createRng(),
      size: ROUND_SIZE,
    });
    showQuestion(card, questions, 0, 0, ui, bestKey, start);
  };
  showIntro(card, ui, bestKey, start);
}

function bestText(ui, bestKey) {
  const best = parseBest(getString(bestKey));
  return best ? fill(ui.best || "Your best: {best}", { best: `${best.score}/${best.total}` }) : "";
}

function showIntro(card, ui, bestKey, start) {
  card.replaceChildren(
    node("p", "quiz-lead", ui.lead || "Eight quick questions on this game's rules, costs and dice odds."),
  );
  const best = bestText(ui, bestKey);
  if (best) card.appendChild(node("p", "quiz-best", best));
  card.appendChild(button("quiz-primary", ui.start || "Start quiz", start));
}

function showQuestion(card, questions, index, score, ui, bestKey, restart) {
  const q = questions[index];
  const progress = node("div", "quiz-progress");
  const bar = node("div", "quiz-progress-bar");
  bar.style.width = `${(index / questions.length) * 100}%`;
  progress.appendChild(bar);

  const counter = node("p", "quiz-counter", fill(ui.progress || "Question {n} of {total}", { n: index + 1, total: questions.length }));
  const prompt = node("p", "quiz-question", q.text);
  prompt.id = `quiz-q-${(questionSeq += 1)}`;
  const options = node("div", `quiz-options${q.type === "tf" ? " is-tf" : ""}`);
  options.setAttribute("role", "group");
  options.setAttribute("aria-labelledby", prompt.id);
  const feedback = node("div", "quiz-feedback");
  feedback.setAttribute("aria-live", "polite");

  q.options.forEach((label, i) => {
    options.appendChild(
      button("quiz-option", label, () => {
        const correct = i === q.answer;
        options.querySelectorAll("button").forEach((b, j) => {
          b.disabled = true;
          if (j === q.answer) b.classList.add("is-correct");
          else if (j === i) b.classList.add("is-wrong");
        });
        feedback.replaceChildren(
          node("p", `quiz-verdict ${correct ? "is-correct" : "is-wrong"}`, correct ? ui.correct || "Correct!" : ui.wrong || "Not quite."),
          node("p", "quiz-explain", q.explain),
        );
        if (q.ref) feedback.appendChild(node("p", "quiz-ref", `📖 ${q.ref}`));
        const last = index === questions.length - 1;
        const next = button("quiz-primary", last ? ui.finish || "See result" : `${ui.next || "Next"} →`, () =>
          last
            ? showResult(card, score + (correct ? 1 : 0), questions.length, ui, bestKey, restart)
            : showQuestion(card, questions, index + 1, score + (correct ? 1 : 0), ui, bestKey, restart),
        );
        feedback.appendChild(next);
        next.focus();
      }),
    );
  });

  card.replaceChildren(progress, counter, prompt, options, feedback);
  options.querySelector("button")?.focus({ preventScroll: true });
  keepTopVisible(card); // a long explanation may have pushed the card's top off-screen
}

function showResult(card, score, total, ui, bestKey, restart) {
  const previous = parseBest(getString(bestKey));
  if (!previous || score / total >= previous.score / previous.total) setString(bestKey, `${score}/${total}`);

  const ring = node("div", "quiz-score");
  ring.style.setProperty("--pct", `${Math.round((score / total) * 100)}%`);
  ring.appendChild(node("span", "quiz-score-value", `${score}/${total}`));

  const message = score === total ? ui.perfect || "Perfect round — you could teach this game!"
    : score >= total * 0.75 ? ui.great || "Great job — just a couple to brush up on."
    : ui.keepGoing || "Good start — read the rules above and try again.";

  const support = node("p", "quiz-support");
  support.append(
    document.createTextNode(`${ui.supportText || "This cheat sheet is a free fan project. If it helps your table, you can support it:"} `),
  );
  const link = document.createElement("a");
  link.href = SUPPORT_URL;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = ui.supportLink || "☕ Donate via PayPal";
  support.appendChild(link);

  const again = button("quiz-primary", ui.again || "Play again", restart);
  card.replaceChildren(ring, node("p", "quiz-message", message));
  const best = bestText(ui, bestKey);
  if (best) card.appendChild(node("p", "quiz-best", best));
  card.append(again, support);
  again.focus({ preventScroll: true });
}

function node(tag, className, value) {
  const el = document.createElement(tag);
  el.className = className;
  if (value != null) el.textContent = value;
  return el;
}

function button(className, label, onClick) {
  const b = node("button", className, label);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}
