// Starting-spot helper. Basic heuristic:
//   score = sum of pips × diversity bonus − desert penalty
// where diversity bonus = 1 + 0.1 × (distinct non-desert resources - 1),
// and desert/water hexes contribute 0 pips and subtract 2 each.
// Intentionally simple — see the problem brief ("basic logic only").

const WAYS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
const RESOURCES = [
  "lumber",
  "brick",
  "wool",
  "grain",
  "ore",
  "gold",
  "desert",
];

export function mount(root, ui = {}) {
  root.innerHTML = "";

  const card = document.createElement("div");
  card.className = "tool-card";

  const h = document.createElement("h3");
  h.className = "tool-title";
  h.textContent = ui.title || "Starting-Spot Helper";
  card.appendChild(h);

  const intro = document.createElement("p");
  intro.className = "tool-intro";
  intro.textContent =
    ui.intro ||
    "Enter the three hexes meeting at your candidate intersection.";
  card.appendChild(intro);

  const form = document.createElement("div");
  form.className = "spot-form";
  const hexes = [0, 1, 2].map((i) => buildHexRow(i, ui));
  hexes.forEach((h) => form.appendChild(h.row));
  card.appendChild(form);

  const scoreBox = document.createElement("div");
  scoreBox.className = "spot-score";
  card.appendChild(scoreBox);

  root.appendChild(card);

  function update() {
    const values = hexes.map((h) => ({
      num: h.numSelect.value,
      res: h.resSelect.value,
    }));
    const { total, diversity, deserts, breakdown } = score(values);
    scoreBox.innerHTML = "";

    const gauge = document.createElement("div");
    gauge.className = "spot-gauge";
    const verdict = getVerdict(total, ui);
    gauge.innerHTML =
      `<div class="spot-total">${total.toFixed(1)}</div>` +
      `<div class="spot-verdict ${verdict.cls}">${verdict.label}</div>`;
    scoreBox.appendChild(gauge);

    const detail = document.createElement("p");
    detail.className = "tool-hint";
    detail.textContent =
      `${ui.diversityLabel || "Diversity multiplier"}: ×${diversity.toFixed(2)}` +
      (deserts
        ? `  •  ${ui.desertsLabel || "Desert/water penalty"}: −${deserts * 2}`
        : "");
    scoreBox.appendChild(detail);

    const list = document.createElement("ul");
    list.className = "spot-breakdown";
    breakdown.forEach((b) => {
      const li = document.createElement("li");
      li.textContent = `${b.label}: ${b.text}`;
      list.appendChild(li);
    });
    scoreBox.appendChild(list);
  }

  hexes.forEach((h) => {
    h.numSelect.addEventListener("change", update);
    h.resSelect.addEventListener("change", update);
  });

  update();
}

function buildHexRow(idx, ui) {
  const row = document.createElement("div");
  row.className = "spot-row";

  const label = document.createElement("label");
  label.className = "spot-row-label";
  label.textContent = `${ui.hexLabel || "Hex"} ${idx + 1}`;
  row.appendChild(label);

  const numSelect = document.createElement("select");
  numSelect.className = "spot-select";
  ["2", "3", "4", "5", "6", "8", "9", "10", "11", "12", "-"].forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v === "-" ? ui.none || "—" : v;
    if (v === "-") opt.selected = true;
    numSelect.appendChild(opt);
  });
  row.appendChild(numSelect);

  const resSelect = document.createElement("select");
  resSelect.className = "spot-select";
  RESOURCES.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = ui["res_" + r] || capitalize(r);
    resSelect.appendChild(opt);
  });
  row.appendChild(resSelect);

  return { row, numSelect, resSelect };
}

export function score(hexes) {
  let pips = 0;
  let deserts = 0;
  const resourcesSeen = new Set();
  const breakdown = [];

  hexes.forEach((h, i) => {
    const label = `Hex ${i + 1}`;
    if (h.res === "desert" || h.num === "-") {
      deserts += 1;
      breakdown.push({ label, text: "desert/empty (−2)" });
      return;
    }
    const w = WAYS[Number(h.num)] || 0;
    pips += w;
    resourcesSeen.add(h.res);
    breakdown.push({ label, text: `${h.num} (${w} pips) · ${h.res}` });
  });

  const distinct = resourcesSeen.size;
  const diversity = 1 + 0.1 * Math.max(0, distinct - 1);
  const total = pips * diversity - deserts * 2;

  return { total, pips, diversity, deserts, breakdown };
}

function getVerdict(total, ui) {
  if (total >= 12) return { cls: "verdict-great", label: ui.verdictGreat || "Excellent spot" };
  if (total >= 9) return { cls: "verdict-good", label: ui.verdictGood || "Strong spot" };
  if (total >= 6) return { cls: "verdict-ok", label: ui.verdictOk || "Decent spot" };
  if (total >= 3) return { cls: "verdict-weak", label: ui.verdictWeak || "Weak spot" };
  return { cls: "verdict-bad", label: ui.verdictBad || "Poor spot" };
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
