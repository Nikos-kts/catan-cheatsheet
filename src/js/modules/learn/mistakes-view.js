// "Rules people get wrong": myth → correct rule → source, for the selected game.
// On phones each myth is collapsed (tap to reveal the rule) so the list fits a
// screen; on wide screens everything is open.

const WIDE = "(min-width: 761px)";

export function mount(root, { game, ui }) {
  const items = (game.learn && game.learn.mistakes) || [];
  if (!items.length) {
    root.appendChild(text("p", "learn-empty", ui.empty || "No common mistakes listed for this game yet."));
    return;
  }

  root.append(
    text("p", "learn-lead", ui.lead || "Even experienced tables get these wrong. Each fix comes from the official rulebook."),
    text("p", "mistake-hint", `👆 ${ui.tapHint || "Tap a myth to see what the rulebook really says."}`),
  );
  const openAll = window.matchMedia(WIDE).matches;
  const list = document.createElement("ol");
  list.className = "mistake-list";
  items.forEach((item) => {
    const details = document.createElement("details");
    details.className = "mistake-details";
    details.open = openAll;

    const summary = document.createElement("summary");
    summary.className = "mistake-myth";
    // <summary> may only hold phrasing content, hence a span for the text.
    summary.append(text("span", "mistake-badge", `✗ ${ui.myth || "Myth"}`), text("span", "mistake-text", item.myth));

    const rule = document.createElement("div");
    rule.className = "mistake-rule";
    rule.append(text("span", "mistake-badge", `✓ ${ui.rule || "Rule"}`), text("p", "mistake-text", item.rule));
    if (item.ref) rule.appendChild(text("p", "mistake-ref", `📖 ${item.ref}`));
    details.append(summary, rule);

    const li = document.createElement("li");
    li.className = "mistake";
    li.appendChild(details);
    list.appendChild(li);
  });
  root.appendChild(list);
}

function text(tag, className, value) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = value;
  return node;
}
