import type { NavigationState, PartialState } from '@react-navigation/routers';

export type INavigationStateLike =
  | NavigationState
  | Omit<PartialState<NavigationState>, 'stale'>;

export type IActiveRoute = { name: string; params?: object };

/** Active routes from the root navigator down to the focused leaf screen. */
export function getActiveRoutePath(
  state: INavigationStateLike | undefined,
): IActiveRoute[] {
  const path: IActiveRoute[] = [];
  let current = state;
  while (current?.routes?.length) {
    const index =
      typeof current.index === 'number'
        ? current.index
        : current.routes.length - 1;
    const route = current.routes[index];
    if (!route) {
      break;
    }
    path.push({ name: route.name, params: route.params });
    current = route.state as INavigationStateLike | undefined;
  }
  return path;
}
