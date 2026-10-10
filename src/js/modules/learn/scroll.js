// Scrolling helpers that account for the sticky tab bar and reduced-motion.

const PHONE = "(max-width: 760px)"; // same breakpoint as learn.css

export const isPhone = () => window.matchMedia(PHONE).matches;

const scrollBehavior = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

function tabsHeight() {
  return document.getElementById("tabs")?.offsetHeight || 0;
}

/** Scroll `el` just below the sticky tabs (or centred in the free space). */
export function scrollBelowTabs(el, center = false) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const free = window.innerHeight - tabsHeight();
  const offset = center && rect.height < free ? (free - rect.height) / 2 : 8;
  window.scrollTo({
    top: Math.max(0, rect.top + window.scrollY - tabsHeight() - offset),
    behavior: scrollBehavior(),
  });
}

/** Scroll only if the top of `el` is hidden behind the tabs or above the viewport. */
export function keepTopVisible(el) {
  if (el && el.getBoundingClientRect().top < tabsHeight() + 4) scrollBelowTabs(el);
}

/**
 * Focus `el` and scroll only as far as needed to show it (honours its CSS
 * scroll-margin). A plain focus() centres an off-screen element with a hard jump.
 */
export function focusGently(el) {
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
}

/**
 * Phones: park `el` right below the tabs so everything it is about to show fits
 * on screen without the page jumping. Wider screens: only fix a hidden top.
 */
export function giveRoom(el) {
  if (isPhone()) scrollBelowTabs(el);
  else keepTopVisible(el);
}
