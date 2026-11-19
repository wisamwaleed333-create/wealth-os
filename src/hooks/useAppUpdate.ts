import { useEffect, useSyncExternalStore } from 'react';
import {
  applyAppUpdate,
  checkForAppUpdates,
  dismissUpdateBanner,
  getAppUpdateSnapshot,
  initAppUpdater,
  subscribeAppUpdate,
} from '../utils/appUpdateManager';

export function useAppUpdate() {
  useEffect(() => {
    initAppUpdater();
  }, []);

  const snapshot = useSyncExternalStore(
    subscribeAppUpdate,
    getAppUpdateSnapshot,
    getAppUpdateSnapshot
  );

  return {
    ...snapshot,
    checkForUpdates: checkForAppUpdates,
    applyUpdate: applyAppUpdate,
    dismissBanner: dismissUpdateBanner,
  };
}
