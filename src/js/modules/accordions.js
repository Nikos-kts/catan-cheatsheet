// Accordion behavior: inside each group selector, opening one <details>
// collapses its siblings and smoothly animates .collapsible-body heights.
// Extracted verbatim from the legacy app.js.

const DEFAULT_GROUPS = [
  ".section-collapsible",
  ".gameplay-collapsible",
  ".subcategory-collapsible",
];

export function initAccordions(groups = DEFAULT_GROUPS) {
  groups.forEach((selector) => {
    const items = Array.from(document.querySelectorAll(selector));
    if (!items.length) return;
    items.forEach((item) => {
      // remove previous handler if present
      if (item._accordionHandler) {
        item.removeEventListener("toggle", item._accordionHandler);
      }
      const handler = () => {
        const body = item.querySelector(".collapsible-body");
        if (item.open) {
          items.forEach((other) => {
            if (other !== item) {
              other.open = false;
              const ob = other.querySelector(".collapsible-body");
              if (ob) ob.style.maxHeight = "0px";
            }
          });

          if (body) {
            const h = body.scrollHeight;
            body.style.maxHeight = h + "px";
          }

          // Scroll summary into view beneath the sticky tabs.
          const tabs = document.getElementById("tabs");
          const tabsHeight = tabs ? tabs.offsetHeight : 0;
          const rect = item.getBoundingClientRect();
          const top = rect.top + window.scrollY - tabsHeight - 8;
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        } else {
          if (body) body.style.maxHeight = "0px";
        }
      };

      const initBody = item.querySelector(".collapsible-body");
      if (initBody) {
        initBody.style.overflow = "hidden";
        initBody.style.transition = "max-height 300ms ease";
        initBody.style.maxHeight = item.open
          ? initBody.scrollHeight + "px"
          : "0px";
      }
      item.addEventListener("toggle", handler, { passive: true });
      item._accordionHandler = handler;
    });
  });
}
