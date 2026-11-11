import { EServiceEndpointEnum } from '@onekeyhq/shared/types/endpoint';
import { EUniversalSearchType } from '@onekeyhq/shared/types/search';

jest.mock('@onekeyhq/shared/src/background/backgroundDecorators', () => ({
  backgroundClass: () => () => undefined,
  backgroundMethod: () => (_t: unknown, _k: unknown, d: PropertyDescriptor) =>
    d,
  toastIfError: () => (_t: unknown, _k: unknown, d: PropertyDescriptor) => d,
}));

jest.mock('./ServiceBase', () => ({
  __esModule: true,
  default: class ServiceBase {
    backgroundApi: unknown;

    getClient: jest.Mock;

    constructor({ backgroundApi }: { backgroundApi: unknown }) {
      this.backgroundApi = backgroundApi;
      this.getClient = jest.fn();
    }
  },
}));

// eslint-disable-next-line import/first
import ServiceUniversalSearch from './ServiceUniversalSearch';

function createService(get: jest.Mock) {
  const Ctor = ServiceUniversalSearch as unknown as new (args: {
    backgroundApi: unknown;
  }) => ServiceUniversalSearch & { getClient: jest.Mock };
  const service = new Ctor({ backgroundApi: {} });
  service.getClient.mockResolvedValue({ get });
  return service;
}

describe('ServiceUniversalSearch help center search', () => {
  test('maps articles from the utility help center endpoint', async () => {
    const get = jest.fn().mockResolvedValue({
      data: {
        code: 0,
        data: {
          items: [
            {
              id: '11863822',
              title: 'How to use OneKey Pro Turbo mode',
              summary: 'Sign faster.',
              url: 'https://help.onekey.so/articles/11863822',
            },
            {
              id: '11461081',
              title: 'Get started with OneKey Pro',
              summary: '',
              url: 'https://help.onekey.so/articles/11461081',
            },
            // Rows without a link cannot be opened and are dropped.
            { id: '1', title: 'No url', summary: '', url: '' },
          ],
          total: 3,
        },
      },
    });
    const service = createService(get);

    const result = await service.universalSearchOfHelpCenter({
      input: '  Pro  ',
    });

    expect(service.getClient).toHaveBeenCalledWith(
      EServiceEndpointEnum.Utility,
    );
    expect(get).toHaveBeenCalledWith('/utility/v1/help-center/search', {
      params: { keyword: 'Pro', limit: 20 },
    });
    expect(result.items).toEqual([
      {
        type: EUniversalSearchType.HelpCenter,
        payload: {
          id: '11863822',
          title: 'How to use OneKey Pro Turbo mode',
          summary: 'Sign faster.',
          url: 'https://help.onekey.so/articles/11863822',
        },
      },
      {
        type: EUniversalSearchType.HelpCenter,
        payload: {
          id: '11461081',
          title: 'Get started with OneKey Pro',
          summary: '',
          url: 'https://help.onekey.so/articles/11461081',
        },
      },
    ]);
  });

  test('caps the keyword at the server limit of 100 characters', async () => {
    const get = jest.fn().mockResolvedValue({ data: { code: 0, data: {} } });
    const service = createService(get);

    await service.universalSearchOfHelpCenter({ input: 'a'.repeat(150) });

    expect(get).toHaveBeenCalledWith('/utility/v1/help-center/search', {
      params: { keyword: 'a'.repeat(100), limit: 20 },
    });
  });

  test('skips the request for a blank query', async () => {
    const get = jest.fn();
    const service = createService(get);

    await expect(
      service.universalSearchOfHelpCenter({ input: '   ' }),
    ).resolves.toEqual({ items: [] });
    expect(get).not.toHaveBeenCalled();
  });

  test('omits the help center group from batch results when the request fails', async () => {
    const get = jest.fn().mockRejectedValue(new Error('network'));
    const service = createService(get);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await service.universalSearch({
      input: 'backup',
      searchTypes: [EUniversalSearchType.HelpCenter],
    });

    expect(result[EUniversalSearchType.HelpCenter]).toBeUndefined();
  });
});
