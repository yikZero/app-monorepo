import { useMemo, useSyncExternalStore } from 'react';

import {
  getEip7702DemoDelegations,
  getEip7702DemoSnapshotVersion,
  subscribeEip7702DemoDelegations,
} from './eip7702DemoData';

// Demo (OK-67574): mock delegations that update after a demo revoke.
export function useEip7702DemoDelegations({
  networkId,
  isAllNetworks,
}: {
  networkId: string;
  isAllNetworks: boolean;
}) {
  const version = useSyncExternalStore(
    subscribeEip7702DemoDelegations,
    getEip7702DemoSnapshotVersion,
  );
  return useMemo(() => {
    // `version` re-runs this after a demo revoke.
    void version;
    return getEip7702DemoDelegations({ networkId, isAllNetworks });
  }, [networkId, isAllNetworks, version]);
}
