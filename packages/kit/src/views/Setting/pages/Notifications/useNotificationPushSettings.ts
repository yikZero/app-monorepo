import { useCallback, useEffect, useRef, useState } from 'react';

import { useDebouncedCallback } from 'use-debounce';

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { usePrimePersistAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import type { INotificationPushSettings } from '@onekeyhq/shared/types/notification';

type INotificationSettingsCache = {
  identityKey: string;
  settings: INotificationPushSettings;
};

type INotificationSettingsState = {
  identityKey: string | undefined;
  settings: INotificationPushSettings | undefined;
};

let cachedNotificationSettings: INotificationSettingsCache | undefined;

// The notifications page and its sub pages are mounted at the same time, so
// every mounted instance listens for cache writes to stay in sync.
const cacheListeners = new Set<(cache: INotificationSettingsCache) => void>();

const EMPTY_NOTIFICATION_SETTINGS_DEFAULTS = {
  pushEnabled: false,
  accountActivityPushEnabled: true,
  priceAlertsEnabled: true,
  perpsEnabled: true,
  announcementEnabled: true,
  dailyUpdateEnabled: true,
  serviceNotificationEnabled: true,
} satisfies INotificationPushSettings;

function getCachedNotificationSettings(identityKey: string | undefined) {
  return identityKey && cachedNotificationSettings?.identityKey === identityKey
    ? cachedNotificationSettings.settings
    : undefined;
}

function hasNotificationSettings(
  settings: INotificationPushSettings | undefined,
) {
  return Boolean(settings && Object.keys(settings).length > 0);
}

function updateCachedNotificationSettings({
  identityKey,
  settings,
}: {
  identityKey: string;
  settings: INotificationPushSettings;
}) {
  const nextCache = { identityKey, settings };
  cachedNotificationSettings = nextCache;
  // Writes can happen inside a state updater; notify other instances after
  // the current render to avoid cross-component updates during render.
  setTimeout(() => {
    cacheListeners.forEach((listener) => listener(nextCache));
  }, 0);
}

export function useNotificationPushSettings() {
  const [primePersistAtom] = usePrimePersistAtom();
  let notificationSettingsIdentityKey: string | undefined;
  if (primePersistAtom.onekeyUserId) {
    notificationSettingsIdentityKey = `onekey-id:${primePersistAtom.onekeyUserId}`;
  } else if (
    !primePersistAtom.isLoggedIn &&
    !primePersistAtom.isLoggedInOnServer
  ) {
    notificationSettingsIdentityKey = 'anonymous';
  }
  const [settingsState, setSettingsState] =
    useState<INotificationSettingsState>(() => ({
      identityKey: notificationSettingsIdentityKey,
      settings: getCachedNotificationSettings(notificationSettingsIdentityKey),
    }));
  const settings =
    settingsState.identityKey === notificationSettingsIdentityKey
      ? settingsState.settings
      : undefined;

  const prevSettings = useRef<INotificationPushSettings | undefined>(
    settingsState.settings,
  );
  const pendingSettings = useRef<INotificationPushSettings | undefined>(
    undefined,
  );
  const settingsMutationVersionRef = useRef(0);
  const notificationSettingsIdentityKeyRef = useRef(
    notificationSettingsIdentityKey,
  );
  const previousNotificationSettingsIdentityKeyRef = useRef(
    notificationSettingsIdentityKey,
  );

  useEffect(() => {
    notificationSettingsIdentityKeyRef.current =
      notificationSettingsIdentityKey;
  }, [notificationSettingsIdentityKey]);

  useEffect(() => {
    const listener = (cache: INotificationSettingsCache) => {
      if (cache.identityKey !== notificationSettingsIdentityKeyRef.current) {
        return;
      }
      setSettingsState((v) =>
        v.identityKey === cache.identityKey && v.settings === cache.settings
          ? v
          : { identityKey: cache.identityKey, settings: cache.settings },
      );
      // The cache always holds the latest full config. A queued save from
      // this instance must send it, or it would overwrite another page's edit.
      if (pendingSettings.current) {
        pendingSettings.current = cache.settings;
      } else {
        prevSettings.current = cache.settings;
      }
    };
    cacheListeners.add(listener);
    return () => {
      cacheListeners.delete(listener);
    };
  }, []);

  const reloadSettings = useCallback(
    async (updated?: INotificationPushSettings) => {
      if (!notificationSettingsIdentityKey) {
        return;
      }
      const requestMutationVersion = settingsMutationVersionRef.current;
      const result =
        updated ||
        (await backgroundApiProxy.serviceNotification.fetchServerNotificationSettings());
      if (
        !updated &&
        requestMutationVersion !== settingsMutationVersionRef.current
      ) {
        return;
      }
      if (
        notificationSettingsIdentityKeyRef.current !==
        notificationSettingsIdentityKey
      ) {
        return;
      }
      // An explicit empty object is a loaded empty config, not a missing payload.
      if (
        (result === undefined || result === null) &&
        hasNotificationSettings(
          getCachedNotificationSettings(notificationSettingsIdentityKey),
        )
      ) {
        return;
      }
      const nextSettings = result ?? {};
      updateCachedNotificationSettings({
        identityKey: notificationSettingsIdentityKey,
        settings: nextSettings,
      });
      setSettingsState({
        identityKey: notificationSettingsIdentityKey,
        settings: nextSettings,
      });
      prevSettings.current = nextSettings;
    },
    [notificationSettingsIdentityKey],
  );

  const isUpdating = useRef(false);
  const doUpdateSettingsToServerRef = useRef<(() => Promise<void>) | undefined>(
    undefined,
  );

  const doUpdateSettingsToServer = useCallback(async () => {
    if (
      !notificationSettingsIdentityKey ||
      notificationSettingsIdentityKeyRef.current !==
        notificationSettingsIdentityKey ||
      isUpdating.current ||
      !pendingSettings.current
    ) {
      return;
    }
    isUpdating.current = true;
    const settingsToUpdate = pendingSettings.current;
    pendingSettings.current = undefined;

    try {
      const updated =
        await backgroundApiProxy.serviceNotification.updateServerNotificationSettings(
          settingsToUpdate,
        );
      // Check if there are new pending settings during the request
      if (pendingSettings.current) {
        // If there are new pending settings, continue updating
        isUpdating.current = false;
        void doUpdateSettingsToServerRef.current?.();
      } else {
        await reloadSettings(updated);
        isUpdating.current = false;
      }
    } catch (e) {
      isUpdating.current = false;
      if (
        notificationSettingsIdentityKeyRef.current ===
          notificationSettingsIdentityKey &&
        prevSettings.current
      ) {
        updateCachedNotificationSettings({
          identityKey: notificationSettingsIdentityKey,
          settings: prevSettings.current,
        });
        setSettingsState({
          identityKey: notificationSettingsIdentityKey,
          settings: prevSettings.current,
        });
      }
      if (pendingSettings.current) {
        void doUpdateSettingsToServerRef.current?.();
      }
      throw e;
    }
  }, [notificationSettingsIdentityKey, reloadSettings]);

  useEffect(() => {
    doUpdateSettingsToServerRef.current = doUpdateSettingsToServer;
  }, [doUpdateSettingsToServer]);

  const updateSettingsToServer = useDebouncedCallback(
    () => {
      void doUpdateSettingsToServer();
    },
    2000,
    {
      leading: false,
      trailing: true,
    },
  );
  const updateSettingsToServerRef = useRef(updateSettingsToServer);

  useEffect(() => {
    updateSettingsToServerRef.current = updateSettingsToServer;
  }, [updateSettingsToServer]);

  const updateSettings = useCallback(
    (partSettings: INotificationPushSettings) => {
      if (!notificationSettingsIdentityKey) {
        return;
      }
      settingsMutationVersionRef.current += 1;
      setSettingsState((v) => {
        if (v.identityKey !== notificationSettingsIdentityKey || !v.settings) {
          return v;
        }
        const currentSettings = hasNotificationSettings(v.settings)
          ? v.settings
          : EMPTY_NOTIFICATION_SETTINGS_DEFAULTS;
        const newValue = {
          ...currentSettings,
          ...partSettings,
        };
        updateCachedNotificationSettings({
          identityKey: notificationSettingsIdentityKey,
          settings: newValue,
        });
        pendingSettings.current = newValue;
        updateSettingsToServer();
        return {
          identityKey: notificationSettingsIdentityKey,
          settings: newValue,
        };
      });
    },
    [notificationSettingsIdentityKey, updateSettingsToServer],
  );

  useEffect(() => {
    const previousIdentityKey =
      previousNotificationSettingsIdentityKeyRef.current;
    const identityChanged =
      previousIdentityKey !== notificationSettingsIdentityKey;
    previousNotificationSettingsIdentityKeyRef.current =
      notificationSettingsIdentityKey;
    const hasOutstandingUpdate = Boolean(
      pendingSettings.current || isUpdating.current,
    );
    if (!identityChanged && hasOutstandingUpdate) {
      return;
    }
    settingsMutationVersionRef.current += 1;
    if (identityChanged) {
      if (
        previousIdentityKey &&
        hasOutstandingUpdate &&
        prevSettings.current !== undefined
      ) {
        updateCachedNotificationSettings({
          identityKey: previousIdentityKey,
          settings: prevSettings.current,
        });
      }
      updateSettingsToServer.cancel();
      pendingSettings.current = undefined;
      const cachedSettings = getCachedNotificationSettings(
        notificationSettingsIdentityKey,
      );
      setSettingsState({
        identityKey: notificationSettingsIdentityKey,
        settings: cachedSettings,
      });
      prevSettings.current = cachedSettings;
    }
    if (notificationSettingsIdentityKey) {
      void reloadSettings();
    }
  }, [
    notificationSettingsIdentityKey,
    primePersistAtom.isLoggedIn,
    primePersistAtom.isLoggedInOnServer,
    primePersistAtom.primeSubscription?.isActive,
    reloadSettings,
    updateSettingsToServer,
  ]);

  // Flush pending settings only when the component actually unmounts.
  useEffect(
    () => () => {
      if (pendingSettings.current) {
        updateSettingsToServerRef.current.flush();
      }
    },
    [],
  );

  return { settings, updateSettings };
}
