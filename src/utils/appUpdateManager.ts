import { registerSW } from 'virtual:pwa-register';
import {
  AppVersionInfo,
  buildVersionCheckUrl,
  compareVersionInfo,
  isAppShellCacheName,
  parseVersionPayload,
} from './appUpdate';

export type ServiceWorkerStatus =
  | 'initializing'
  | 'active'
  | 'waiting'
  | 'unsupported'
  | 'error';

export interface AppUpdateState {
  currentVersion: AppVersionInfo;
  availableVersion: AppVersionInfo | null;
  needRefresh: boolean;
  remoteUpdateAvailable: boolean;
  updateAvailable: boolean;
  isChecking: boolean;
  isUpdating: boolean;
  lastCheckedAt: string | null;
  checkError: string | null;
  swStatus: ServiceWorkerStatus;
  dismissedBanner: boolean;
}

const CURRENT_VERSION: AppVersionInfo = {
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.2.0',
  buildId: typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev',
  builtAt: typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : '',
};

const AUTO_CHECK_THROTTLE_MS = 15_000;
const PERIODIC_CHECK_INTERVAL_MS = 180_000;

let state: AppUpdateState = {
  currentVersion: CURRENT_VERSION,
  availableVersion: CURRENT_VERSION,
  needRefresh: false,
  remoteUpdateAvailable: false,
  updateAvailable: false,
  isChecking: false,
  isUpdating: false,
  lastCheckedAt: null,
  checkError: null,
  swStatus:
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      ? 'initializing'
      : 'unsupported',
  dismissedBanner: false,
};

const listeners = new Set<() => void>();
let initialized = false;
let swRegistration: ServiceWorkerRegistration | null = null;
let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let lastCheckStartedAt = 0;
let pendingReloadOnControllerChange = false;
let hasTriggeredReload = false;

function emit(next: Partial<AppUpdateState>) {
  const merged = { ...state, ...next };
  merged.updateAvailable = merged.needRefresh || merged.remoteUpdateAvailable;
  state = merged;
  listeners.forEach((listener) => listener());
}

function performSafePageReload() {
  if (typeof window === 'undefined' || hasTriggeredReload) {
    return;
  }
  hasTriggeredReload = true;
  window.location.reload();
}

async function clearAppShellCachesOnly(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }
  try {
    const cacheNames = await window.caches.keys();
    const targets = cacheNames.filter((name) => isAppShellCacheName(name));
    await Promise.all(targets.map((name) => window.caches.delete(name)));
  } catch {
    // Ignore cache API errors
  }
}

export function getAppUpdateSnapshot(): AppUpdateState {
  return state;
}

export function subscribeAppUpdate(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissUpdateBanner(): void {
  emit({ dismissedBanner: true });
}

export async function checkForAppUpdates(manual = false): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  const now = Date.now();
  if (!manual && now - lastCheckStartedAt < AUTO_CHECK_THROTTLE_MS) {
    return state.updateAvailable;
  }
  if (state.isChecking) {
    return state.updateAvailable;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    if (manual) {
      emit({
        checkError: 'تعذر التحقق من التحديثات لأن الجهاز غير متصل بالإنترنت.',
      });
    }
    return state.updateAvailable;
  }

  lastCheckStartedAt = now;
  emit({ isChecking: true, checkError: null });

  try {
    // Trigger sw.js byte check without blocking fast version.json check on mobile networks
    if (swRegistration) {
      void swRegistration.update().catch(() => undefined);
    }

    const versionUrl = buildVersionCheckUrl(window.location.origin, now);
    const response = await fetch(versionUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    const parsed = parseVersionPayload(json);
    if (!parsed) {
      throw new Error('Invalid version payload');
    }

    const comparison = compareVersionInfo(CURRENT_VERSION, parsed);
    const hasRemoteUpdate = comparison.hasUpdate;

    emit({
      availableVersion: parsed,
      remoteUpdateAvailable: hasRemoteUpdate,
      isChecking: false,
      lastCheckedAt: new Date().toISOString(),
      checkError: null,
      dismissedBanner: hasRemoteUpdate ? false : state.dismissedBanner,
    });

    if (hasRemoteUpdate && swRegistration) {
      void swRegistration.update().catch(() => undefined);
    }

    return hasRemoteUpdate || state.needRefresh;
  } catch {
    emit({
      isChecking: false,
      lastCheckedAt: new Date().toISOString(),
      checkError: manual
        ? 'تعذر الوصول إلى خادم التحقق من الإصدارات حالياً. حاول مجدداً.'
        : null,
    });
    return state.updateAvailable;
  }
}

export async function applyAppUpdate(): Promise<void> {
  if (typeof window === 'undefined' || state.isUpdating) {
    return;
  }

  emit({ isUpdating: true });
  pendingReloadOnControllerChange = true;

  try {
    if (swRegistration && !swRegistration.waiting) {
      await swRegistration.update().catch(() => undefined);
    }

    const waitingWorker = swRegistration?.waiting;

    if (updateSWFn && (state.needRefresh || waitingWorker)) {
      const fallbackTimer = window.setTimeout(() => {
        clearAppShellCachesOnly().finally(() => {
          performSafePageReload();
        });
      }, 2500);

      await updateSWFn(true);

      // If waiting worker did not trigger controllerchange directly, send SKIP_WAITING explicitly
      if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Wait briefly; controllerchange listener handles reload immediately when activated
      void fallbackTimer;
      return;
    }

    // No waiting SW (e.g., iOS delayed SW check or version.json updated first):
    // Clean only app-shell caches (never touch localStorage/IndexedDB financial records) and reload.
    await clearAppShellCachesOnly();
    performSafePageReload();
  } catch {
    await clearAppShellCachesOnly();
    performSafePageReload();
  }
}

export function initAppUpdater(): void {
  if (typeof window === 'undefined' || initialized) {
    return;
  }
  initialized = true;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (pendingReloadOnControllerChange) {
        performSafePageReload();
      }
    });

    navigator.serviceWorker.ready
      .then((reg) => {
        swRegistration = swRegistration ?? reg;
        if (reg.waiting) {
          emit({
            needRefresh: true,
            swStatus: 'waiting',
            dismissedBanner: false,
          });
        } else if (state.swStatus === 'initializing') {
          emit({ swStatus: 'active' });
        }
      })
      .catch(() => undefined);

    try {
      updateSWFn = registerSW({
        immediate: true,
        onNeedRefresh() {
          emit({
            needRefresh: true,
            swStatus: 'waiting',
            dismissedBanner: false,
          });
        },
        onOfflineReady() {
          if (state.swStatus === 'initializing') {
            emit({ swStatus: 'active' });
          }
        },
        onRegisteredSW(_swUrl, registration) {
          swRegistration = registration ?? null;
          if (!registration) {
            emit({ swStatus: 'active' });
            return;
          }

          if (registration.waiting) {
            emit({
              needRefresh: true,
              swStatus: 'waiting',
              dismissedBanner: false,
            });
          } else {
            emit({ swStatus: 'active' });
          }

          registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (
                installing.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                emit({
                  needRefresh: true,
                  swStatus: 'waiting',
                  dismissedBanner: false,
                });
              }
            });
          });
        },
        onRegisterError() {
          emit({ swStatus: 'error' });
        },
      });
    } catch {
      emit({ swStatus: 'error' });
    }
  } else {
    emit({ swStatus: 'unsupported' });
  }

  // Check immediately on boot, when returning to app on mobile/desktop, and periodically
  void checkForAppUpdates(false);

  const handleResumeCheck = () => {
    if (document.visibilityState === 'visible') {
      void checkForAppUpdates(false);
    }
  };

  document.addEventListener('visibilitychange', handleResumeCheck);
  window.addEventListener('focus', () => {
    void checkForAppUpdates(false);
  });
  window.addEventListener('online', () => {
    void checkForAppUpdates(false);
  });

  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void checkForAppUpdates(false);
    }
  }, PERIODIC_CHECK_INTERVAL_MS);
}
