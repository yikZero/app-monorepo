type IAsyncFn = (...args: unknown[]) => Promise<unknown>;

function asyncEmpty(..._args: unknown[]) {
  return Promise.resolve(undefined);
}

function createService(overrides: Record<string, IAsyncFn> = {}) {
  return new Proxy(overrides, {
    get(target, prop) {
      if (
        typeof prop === 'string' &&
        Object.prototype.hasOwnProperty.call(target, prop)
      ) {
        return target[prop];
      }
      if (prop === 'then') {
        return undefined;
      }
      return asyncEmpty;
    },
  });
}

const fixtureServices = {
  serviceNetwork: createService({
    getNetworksByIds: async () => ({ networks: [] }),
    getNetwork: async () => ({
      id: 'evm--1',
      name: 'Ethereum',
      logoURI: '',
    }),
    getNetworkSafe: async () => ({
      id: 'evm--1',
      name: 'Ethereum',
      logoURI: '',
    }),
  }),
  serviceDiscovery: createService({
    buildWebsiteIconUrl: async () => '',
  }),
  serviceAccount: createService({
    getAccountAddressForApi: async () => '',
    getAccountNameFromAddress: async () => [],
  }),
  simpleDb: new Proxy(
    {},
    {
      get: () => createService(),
    },
  ),
};

const backgroundApiProxy = new Proxy(fixtureServices, {
  get(target, prop) {
    if (
      typeof prop === 'string' &&
      Object.prototype.hasOwnProperty.call(target, prop)
    ) {
      return target[prop as keyof typeof target];
    }
    if (typeof prop === 'string' && prop.startsWith('service')) {
      return createService();
    }
    return asyncEmpty;
  },
});

export default backgroundApiProxy;
