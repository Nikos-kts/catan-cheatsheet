// Tab controller: click/keyboard switching (roving tabindex), sticky-tab
// shadow toggle, and persistence of the active tab.

import { state, notify } from "./state.js";
import { VALID_TABS, STORAGE_KEYS } from "./constants.js";
import { setString } from "./storage.js";

/**
 * @param {() => void} onChange Called (sync) after the tab changes; host
 *   should re-render the appropriate tab content.
 */
export function initTabs(onChange) {
  const tabsEl = document.getElementById("tabs");
  if (!tabsEl) return;

  // Ensure role/aria wiring
  tabsEl.setAttribute("role", "tablist");
  const buttons = Array.from(tabsEl.querySelectorAll(".tab"));
  buttons.forEach((btn, idx) => {
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", btn.classList.contains("active") ? "true" : "false");
    btn.tabIndex = btn.classList.contains("active") ? 0 : -1;

    btn.addEventListener("click", () => selectTab(btn.dataset.tab));

    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const next = buttons[(idx + dir + buttons.length) % buttons.length];
        next.focus();
        selectTab(next.dataset.tab);
      } else if (e.key === "Home") {
        e.preventDefault();
        buttons[0].focus();
        selectTab(buttons[0].dataset.tab);
      } else if (e.key === "End") {
        e.preventDefault();
        buttons[buttons.length - 1].focus();
        selectTab(buttons[buttons.length - 1].dataset.tab);
      }
    });
  });

  function selectTab(tabId) {
    if (!VALID_TABS.includes(tabId)) return;
    state.tab = tabId;
    setString(STORAGE_KEYS.tab, tabId);
    buttons.forEach((b) => {
      const active = b.dataset.tab === tabId;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
      b.tabIndex = active ? 0 : -1;
    });
    notify("tab");
    if (typeof onChange === "function") onChange();
  }

  // Expose for boot-time sync after restore-from-storage
  initTabs._syncActive = () => {
    buttons.forEach((b) => {
      const active = b.dataset.tab === state.tab;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
      b.tabIndex = active ? 0 : -1;
    });
  };
}

/** Re-sync the active tab styling from `state.tab` (after storage restore). */
export function syncActiveTab() {
  if (typeof initTabs._syncActive === "function") initTabs._syncActive();
}

// Sticky-tabs shadow toggle
export function initStickyTabs() {
  const tabs = document.getElementById("tabs");
  if (!tabs) return;

  let tabsTop = tabs.getBoundingClientRect().top + window.scrollY;

  function onScroll() {
    if (window.scrollY >= tabsTop) tabs.classList.add("stuck");
    else tabs.classList.remove("stuck");
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    tabsTop = tabs.getBoundingClientRect().top + window.scrollY;
    onScroll();
  });

  setTimeout(onScroll, 0);
}
