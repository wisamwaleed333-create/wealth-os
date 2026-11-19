export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'wealth_os_theme';

export function resolveInitialTheme(
  storedValue?: string | null,
  prefersDark = false
): ThemeMode {
  if (storedValue === 'dark' || storedValue === 'light') {
    return storedValue;
  }
  return prefersDark ? 'dark' : 'light';
}

export function toggleThemeMode(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark';
}

export function loadThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = Boolean(
      window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    return resolveInitialTheme(stored, prefersDark);
  } catch {
    return 'light';
  }
}

export function saveThemeMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function applyThemeClass(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', mode === 'dark');
}
