// Dice-odds tool. User builds a list of hex numbers (2-12) they own; the
// tool shows each number's pip count and the combined expected pips per
// roll. Pure, no dependencies.

// pips = count of red dots on the Catan number disc = min(ways, 5)
const WAYS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
const NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12]; // 7 excluded (robber roll)

export function mount(root, ui = {}) {
  root.innerHTML = "";

  const card = document.createElement("div");
  card.className = "tool-card";

  const header = document.createElement("h3");
  header.className = "tool-title";
  header.textContent = ui.title || "Dice Odds Calculator";
  card.appendChild(header);

  const intro = document.createElement("p");
  intro.className = "tool-intro";
  intro.textContent =
    ui.intro ||
    "Tap the numbers on your hexes to see combined production odds.";
  card.appendChild(intro);

  // Number picker grid
  const picker = document.createElement("div");
  picker.className = "dice-picker";
  const counts = Object.fromEntries(NUMBERS.map((n) => [n, 0]));

  NUMBERS.forEach((n) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dice-num-btn";
    btn.dataset.num = String(n);
    btn.setAttribute(
      "data-tooltip",
      `${WAYS[n]}/36 (${((WAYS[n] / 36) * 100).toFixed(2)}%)`,
    );
    btn.innerHTML =
      `<span class="dice-num-label">${n}</span>` +
      `<span class="dice-num-count" aria-hidden="true">0</span>`;
    btn.addEventListener("click", () => {
      counts[n] += 1;
      btn.querySelector(".dice-num-count").textContent = String(counts[n]);
      update();
    });
    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (counts[n] > 0) counts[n] -= 1;
      btn.querySelector(".dice-num-count").textContent = String(counts[n]);
      update();
    });
    picker.appendChild(btn);
  });
  card.appendChild(picker);

  const hint = document.createElement("p");
  hint.className = "tool-hint";
  hint.textContent =
    ui.hint ||
    "Left-click to add, right-click (or long-press) to remove. 7 is excluded (robber roll).";
  card.appendChild(hint);

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "tool-btn";
  reset.textContent = ui.reset || "Reset";
  reset.addEventListener("click", () => {
    NUMBERS.forEach((n) => (counts[n] = 0));
    picker.querySelectorAll(".dice-num-count").forEach((el) => (el.textContent = "0"));
    update();
  });
  card.appendChild(reset);

  // Results
  const results = document.createElement("div");
  results.className = "dice-results";
  card.appendChild(results);

  root.appendChild(card);

  function update() {
    results.innerHTML = "";

    const rows = NUMBERS.map((n) => ({
      n,
      hexes: counts[n],
      pips: WAYS[n] * counts[n],
    })).filter((r) => r.hexes > 0);

    const totalPips = rows.reduce((s, r) => s + r.pips, 0);
    const expectedPerRoll = totalPips / 36;

    const summary = document.createElement("div");
    summary.className = "dice-summary";
    summary.innerHTML =
      `<strong>${ui.totalPips || "Total pips"}:</strong> ${totalPips} &nbsp;|&nbsp; ` +
      `<strong>${ui.perRoll || "Expected resources per roll"}:</strong> ${expectedPerRoll.toFixed(
        2,
      )}`;
    results.appendChild(summary);

    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "tool-hint";
      empty.textContent = ui.empty || "Add some numbers to see results.";
      results.appendChild(empty);
      return;
    }

    const maxPips = Math.max(...rows.map((r) => r.pips));
    const list = document.createElement("ul");
    list.className = "dice-bars";
    rows.forEach((r) => {
      const li = document.createElement("li");
      li.className = "dice-bar-row";
      const label = document.createElement("span");
      label.className = "dice-bar-label";
      label.textContent = `${r.n}  ×${r.hexes}`;
      li.appendChild(label);
      const track = document.createElement("span");
      track.className = "dice-bar-track";
      const fill = document.createElement("span");
      fill.className = "dice-bar-fill";
      fill.style.width = `${(r.pips / maxPips) * 100}%`;
      track.appendChild(fill);
      li.appendChild(track);
      const val = document.createElement("span");
      val.className = "dice-bar-val";
      val.textContent = `${r.pips} ${ui.pipsLabel || "pips"}`;
      li.appendChild(val);
      list.appendChild(li);
    });
    results.appendChild(list);
  }

  update();
}
