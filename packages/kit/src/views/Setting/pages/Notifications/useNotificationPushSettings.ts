import { useEffect, useSyncExternalStore } from 'react';

import { debounce } from 'lodash';

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { usePrimePersistAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import type { INotificationPushSettings } from '@onekeyhq/shared/types/notification';

type INotificationSettingsState = {
  identityKey: string | undefined;
  settings: INotificationPushSettings | undefined;
};

const EMPTY_NOTIFICATION_SETTINGS_DEFAULTS = {
  pushEnabled: false,
  accountActivityPushEnabled: true,
  priceAlertsEnabled: true,
  perpsEnabled: true,
  announcementEnabled: true,
  dailyUpdateEnabled: true,
} satisfies INotificationPushSettings;

// One store shared by the notifications page and its sub pages, so they read
// the same settings and go through a single save queue.
let state: INotificationSettingsState = {
  identityKey: undefined,
  settings: undefined,
};
const listeners = new Set<() => void>();
// Last config confirmed by the server, used to roll back a failed save.
let confirmedSettings: INotificationPushSettings | undefined;
let pendingSettings: INotificationPushSettings | undefined;
let isSaving = false;
let mutationVersion = 0;

function setState(next: INotificationSettingsState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function hasNotificationSettings(
  settings: INotificationPushSettings | undefined,
) {
  return Boolean(settings && Object.keys(settings).length > 0);
}

function applyServerSettings(
  identityKey: string,
  result: INotificationPushSettings | undefined | null,
) {
  if (state.identityKey !== identityKey) {
    return;
  }
  // An explicit empty object is a loaded empty config, not a missing payload.
  if (
    (result === undefined || result === null) &&
    hasNotificationSettings(state.settings)
  ) {
    return;
  }
  const settings = result ?? {};
  confirmedSettings = settings;
  setState({ identityKey, settings });
}

async function saveSettings() {
  const { identityKey } = state;
  if (!identityKey || isSaving || !pendingSettings) {
    return;
  }
  isSaving = true;
  const settingsToSave = pendingSettings;
  pendingSettings = undefined;
  try {
    const updated =
      await backgroundApiProxy.serviceNotification.updateServerNotificationSettings(
        settingsToSave,
      );
    isSaving = false;
    if (pendingSettings) {
      void saveSettings();
    } else {
      applyServerSettings(identityKey, updated);
    }
  } catch (e) {
    isSaving = false;
    if (state.identityKey === identityKey && confirmedSettings) {
      setState({ identityKey, settings: confirmedSettings });
    }
    if (pendingSettings) {
      void saveSettings();
    }
    throw e;
  }
}

const scheduleSave = debounce(
  () => {
    void saveSettings();
  },
  2000,
  { leading: false, trailing: true },
);

async function reloadSettings(identityKey: string) {
  const requestVersion = mutationVersion;
  const result =
    await backgroundApiProxy.serviceNotification.fetchServerNotificationSettings();
  if (requestVersion !== mutationVersion) {
    return;
  }
  applyServerSettings(identityKey, result);
}

function activateIdentity(identityKey: string | undefined) {
  if (state.identityKey !== identityKey) {
    // Drop unsaved edits of the previous identity.
    scheduleSave.cancel();
    pendingSettings = undefined;
    confirmedSettings = undefined;
    mutationVersion += 1;
    setState({ identityKey, settings: undefined });
  } else if (pendingSettings || isSaving) {
    return;
  }
  if (identityKey) {
    void reloadSettings(identityKey);
  }
}

function updateSettings(partSettings: INotificationPushSettings) {
  const { identityKey, settings } = state;
  if (!identityKey || !settings) {
    return;
  }
  mutationVersion += 1;
  const currentSettings: INotificationPushSettings = hasNotificationSettings(
    settings,
  )
    ? settings
    : EMPTY_NOTIFICATION_SETTINGS_DEFAULTS;
  const nextSettings: INotificationPushSettings = {
    ...currentSettings,
    ...partSettings,
  };
  if (partSettings.marketingSubs) {
    nextSettings.marketingSubs = {
      ...currentSettings.marketingSubs,
      ...partSettings.marketingSubs,
    };
  }
  pendingSettings = nextSettings;
  setState({ identityKey, settings: nextSettings });
  scheduleSave();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    // Save right away once the last notifications page closes.
    if (listeners.size === 0) {
      scheduleSave.flush();
    }
  };
}

function getSnapshot() {
  return state;
}

export function useNotificationPushSettings() {
  const [primePersistAtom] = usePrimePersistAtom();
  let identityKey: string | undefined;
  if (primePersistAtom.onekeyUserId) {
    identityKey = `onekey-id:${primePersistAtom.onekeyUserId}`;
  } else if (
    !primePersistAtom.isLoggedIn &&
    !primePersistAtom.isLoggedInOnServer
  ) {
    identityKey = 'anonymous';
  }
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    activateIdentity(identityKey);
  }, [
    identityKey,
    primePersistAtom.isLoggedIn,
    primePersistAtom.isLoggedInOnServer,
    primePersistAtom.primeSubscription?.isActive,
  ]);

  return {
    settings:
      snapshot.identityKey === identityKey ? snapshot.settings : undefined,
    updateSettings,
  };
}
