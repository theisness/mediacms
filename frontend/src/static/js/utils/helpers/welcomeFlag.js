const STORAGE_KEY = 'lotus-welcome-seen';

export function hasSeenWelcome() {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch (e) {
    return true;
  }
}

export function markWelcomeSeen() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch (e) {
    // ignore
  }
}

export function clearWelcomeSeen() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}
