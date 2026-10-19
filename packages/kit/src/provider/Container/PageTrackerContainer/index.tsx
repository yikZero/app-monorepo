import { useOnRouterChange } from '@onekeyhq/components';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import { ETabHomeRoutes } from '@onekeyhq/shared/src/routes';
import { ETabRoutes } from '@onekeyhq/shared/src/routes/tab';

import { getActiveRoutePath } from '../../../routes/activeRoutePath';

import type { INavigationStateLike } from '../../../routes/activeRoutePath';

export default function PageTrackerContainer() {
  useOnRouterChange((state) => {
    try {
      if (state === undefined) {
        defaultLogger.app.page.pageView(ETabHomeRoutes.TabHome);
      } else {
        const path = getActiveRoutePath(state as INavigationStateLike);
        const page = path[path.length - 1];
        // Perp has its own page view event with source tracking.
        if (page && page.name !== ETabRoutes.Perp) {
          defaultLogger.app.page.pageView(page.name);
        }
      }
    } catch (error) {
      console.error('useOnRouterChange error', error);
    }
  });
  return null;
}
