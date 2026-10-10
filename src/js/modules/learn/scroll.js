// Scrolling helpers that account for the sticky tab bar and reduced-motion.

function tabsHeight() {
  return document.getElementById("tabs")?.offsetHeight || 0;
}

/** Scroll `el` just below the sticky tabs (or centred in the free space). */
export function scrollBelowTabs(el, center = false) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const free = window.innerHeight - tabsHeight();
  const offset = center && rect.height < free ? (free - rect.height) / 2 : 8;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({
    top: Math.max(0, rect.top + window.scrollY - tabsHeight() - offset),
    behavior: reduce ? "auto" : "smooth",
  });
}

/** Scroll only if the top of `el` is hidden behind the tabs or above the viewport. */
export function keepTopVisible(el) {
  if (el && el.getBoundingClientRect().top < tabsHeight() + 4) scrollBelowTabs(el);
}
