// Thin wrapper over localStorage for string values.
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
