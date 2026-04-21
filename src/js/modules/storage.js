// Thin wrapper over localStorage with JSON fallback for non-string values.
// Silently no-ops if localStorage is unavailable (private mode, SSR, etc.).

function safe(fn) {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

export function getString(key) {
  return safe(() => localStorage.getItem(key)) ?? null;
}

export function setString(key, value) {
  safe(() => localStorage.setItem(key, value));
}

export function getJSON(key, fallback = null) {
  const raw = getString(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setJSON(key, value) {
  safe(() => localStorage.setItem(key, JSON.stringify(value)));
}
