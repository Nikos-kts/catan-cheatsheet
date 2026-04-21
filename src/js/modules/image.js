// Shared image helper: builds an <img> that gracefully falls back to a
// labelled placeholder node when the source fails to load or is missing.
// This generalizes the `onerror` pattern previously used only on the banner.

/**
 * @param {string|null|undefined} src Image path (relative). If falsy, placeholder is returned immediately.
 * @param {string} label Accessible label (alt text + placeholder caption).
 * @param {object} [opts]
 * @param {string} [opts.className] Extra class names for the <img>.
 * @param {string} [opts.placeholderClassName] Extra class names for the placeholder wrapper.
 * @param {string} [opts.icon] Optional emoji/icon shown on placeholder.
 * @param {boolean} [opts.lazy=true] Use loading="lazy".
 * @returns {HTMLElement} Either an <img> or a placeholder <div>.
 */
export function buildImage(src, label, opts = {}) {
  const {
    className = "",
    placeholderClassName = "",
    icon = "🃏",
    lazy = true,
  } = opts;

  if (!src) return makePlaceholder(label, icon, placeholderClassName);

  const img = document.createElement("img");
  img.src = src;
  img.alt = label || "";
  if (className) img.className = className;
  if (lazy) img.loading = "lazy";

  // On load failure, swap in a labelled placeholder so layout never breaks.
  img.onerror = () => {
    const placeholder = makePlaceholder(label, icon, placeholderClassName);
    if (img.parentNode) img.parentNode.replaceChild(placeholder, img);
  };

  return img;
}

function makePlaceholder(label, icon, extraClass) {
  const el = document.createElement("div");
  el.className = `img-placeholder ${extraClass}`.trim();
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", label || "Image unavailable");

  const iconEl = document.createElement("span");
  iconEl.className = "img-placeholder-icon";
  iconEl.setAttribute("aria-hidden", "true");
  iconEl.textContent = icon || "🖼️";
  el.appendChild(iconEl);

  const captionEl = document.createElement("span");
  captionEl.className = "img-placeholder-label";
  captionEl.textContent = label ? `Placeholder: ${label}` : "Placeholder";
  el.appendChild(captionEl);

  return el;
}
