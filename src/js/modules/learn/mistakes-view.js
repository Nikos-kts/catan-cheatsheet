// "Rules people get wrong": myth → correct rule → source, for the selected game.

export function mount(root, { game, ui }) {
  const items = (game.learn && game.learn.mistakes) || [];
  if (!items.length) {
    root.appendChild(text("p", "learn-empty", ui.empty || "No common mistakes listed for this game yet."));
    return;
  }

  root.appendChild(
    text("p", "learn-lead", ui.lead || "Even experienced tables get these wrong. Each fix comes from the official rulebook."),
  );
  const list = document.createElement("ol");
  list.className = "mistake-list";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "mistake";
    li.append(
      row("mistake-myth", "✗", ui.myth || "Myth", item.myth),
      row("mistake-rule", "✓", ui.rule || "Rule", item.rule),
    );
    if (item.ref) li.appendChild(text("p", "mistake-ref", `📖 ${item.ref}`));
    list.appendChild(li);
  });
  root.appendChild(list);
}

function row(className, mark, label, body) {
  const div = document.createElement("div");
  div.className = className;
  const badge = text("span", "mistake-badge", `${mark} ${label}`);
  div.append(badge, text("p", "mistake-text", body));
  return div;
}

function text(tag, className, value) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = value;
  return node;
}
