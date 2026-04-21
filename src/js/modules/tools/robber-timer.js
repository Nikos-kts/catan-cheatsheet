// Robber 7-timer: shows the theoretical 7-roll frequency (6/36 = 1/6) and
// a manual counter of "rolls since last 7" for luck-tracking nerds.

export function mount(root, ui = {}) {
  root.innerHTML = "";

  const card = document.createElement("div");
  card.className = "tool-card";

  const h = document.createElement("h3");
  h.className = "tool-title";
  h.textContent = ui.title || "Robber Timer";
  card.appendChild(h);

  const intro = document.createElement("p");
  intro.className = "tool-intro";
  intro.textContent =
    ui.intro ||
    "Theoretical 7-frequency: 6/36 = 16.67% (≈1 in 6 rolls). Track your actual runs below.";
  card.appendChild(intro);

  let rolls = 0;
  let sevens = 0;

  const stats = document.createElement("div");
  stats.className = "robber-stats";
  card.appendChild(stats);

  const btnRow = document.createElement("div");
  btnRow.className = "robber-buttons";

  const btnRoll = document.createElement("button");
  btnRoll.type = "button";
  btnRoll.className = "tool-btn";
  btnRoll.textContent = ui.rollBtn || "+1 Roll";
  btnRoll.addEventListener("click", () => {
    rolls += 1;
    update();
  });
  btnRow.appendChild(btnRoll);

  const btnSeven = document.createElement("button");
  btnSeven.type = "button";
  btnSeven.className = "tool-btn tool-btn-accent";
  btnSeven.textContent = ui.sevenBtn || "+1 Seven";
  btnSeven.addEventListener("click", () => {
    rolls += 1;
    sevens += 1;
    update();
  });
  btnRow.appendChild(btnSeven);

  const btnReset = document.createElement("button");
  btnReset.type = "button";
  btnReset.className = "tool-btn";
  btnReset.textContent = ui.reset || "Reset";
  btnReset.addEventListener("click", () => {
    rolls = 0;
    sevens = 0;
    update();
  });
  btnRow.appendChild(btnReset);

  card.appendChild(btnRow);
  root.appendChild(card);

  function update() {
    const pct = rolls ? ((sevens / rolls) * 100).toFixed(1) : "0.0";
    const expected = (rolls / 6).toFixed(2);
    stats.innerHTML =
      `<div><strong>${ui.rolls || "Total rolls"}:</strong> ${rolls}</div>` +
      `<div><strong>${ui.sevensObserved || "Sevens observed"}:</strong> ${sevens} (${pct}%)</div>` +
      `<div><strong>${ui.sevensExpected || "Sevens expected"}:</strong> ${expected}</div>`;
  }

  update();
}
