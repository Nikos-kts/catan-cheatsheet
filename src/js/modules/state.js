// Central mutable app state + tiny pub/sub so modules can react to changes.
export const state = {
  lang: "en",
  game: "base",
  tab: "cards",
  data: null,
  // extra expansion strategy overlays (array of game ids). Populated from storage.
  strategyExtras: [],
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify(changedKey) {
  listeners.forEach((fn) => {
    try {
      fn(changedKey, state);
    } catch (err) {
      // swallow listener errors to avoid breaking the broadcast
      console.error("state listener error:", err);
    }
  });
}
