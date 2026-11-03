import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useFocusEffect } from '@react-navigation/core';

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { usePrimeGiftEligibilityPersistAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms/prime';
import {
  EAppEventBusNames,
  appEventBus,
} from '@onekeyhq/shared/src/eventBus/appEventBus';

import {
  pickPrimeGiftCandidates,
  selectClaimable,
} from './primeGiftClaimableDevices';

import type { IPrimeGiftDeviceCandidate } from './primeGiftClaimableDevices';

async function loadPrimeGiftCandidates(isCurrent: () => boolean) {
  const walletsWithDevice =
    await backgroundApiProxy.serviceAccount.getAllHwQrWalletWithDevice({
      filterQrWallet: true,
      filterHiddenWallet: true,
    });
  if (!isCurrent()) return undefined;
  const candidates = pickPrimeGiftCandidates(walletsWithDevice);
  void Promise.allSettled(
    candidates.map((item) =>
      backgroundApiProxy.servicePrime.apiGetPrimeGiftEligibility({
        serialNo: item.serialNo,
      }),
    ),
  ).catch(() => undefined);
  return candidates;
}

export function usePrimeGiftClaimableDevices() {
  const [eligibilityBySerialNo] = usePrimeGiftEligibilityPersistAtom();
  const [candidates, setCandidates] = useState<
    IPrimeGiftDeviceCandidate[] | undefined
  >(undefined);
  const requestRef = useRef(0);
  const load = useCallback(() => {
    const request = requestRef.current + 1;
    requestRef.current = request;
    const isCurrent = () => requestRef.current === request;
    // A failed wallet read is not an empty device list. Leave the last
    // successful list, or undefined when nothing has loaded yet.
    void loadPrimeGiftCandidates(isCurrent)
      .then((next) => {
        if (next && isCurrent()) setCandidates(next);
      })
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        requestRef.current += 1;
      };
    }, [load]),
  );

  useEffect(() => {
    const onRedeemed = () => {
      load();
    };
    appEventBus.on(EAppEventBusNames.PrimeGiftRedeemed, onRedeemed);
    return () => {
      appEventBus.off(EAppEventBusNames.PrimeGiftRedeemed, onRedeemed);
    };
  }, [load]);

  const devices = useMemo(
    () =>
      candidates
        ? selectClaimable(candidates, eligibilityBySerialNo)
        : undefined,
    [candidates, eligibilityBySerialNo],
  );

  return { devices };
}
