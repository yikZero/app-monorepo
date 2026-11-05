import {
  settingsAtomInitialValue,
  settingsPersistAtom,
} from '../states/jotai/atoms/settings';

import ServiceSetting from './ServiceSetting';

describe('ServiceSetting sidebar labels', () => {
  const originalIsInBackground = globalThis.$onekeyIsInBackground;

  beforeAll(() => {
    globalThis.$onekeyIsInBackground = true;
  });

  afterAll(() => {
    globalThis.$onekeyIsInBackground = originalIsInBackground;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('defaults to hidden', () => {
    expect(settingsAtomInitialValue.showSidebarLabels).toBe(false);
  });

  it.each([true, false])('persists showSidebarLabels=%s', async (value) => {
    const set = jest
      .spyOn(settingsPersistAtom, 'set')
      .mockResolvedValue(undefined as never);
    const service = new ServiceSetting({
      backgroundApi: { simpleDb: { appStatus: {} } },
    });
    await service.setShowSidebarLabels(value);
    expect(set).toHaveBeenCalledWith(expect.any(Function));
    const update = set.mock.calls[0][0];
    expect(typeof update).toBe('function');
    if (typeof update === 'function') {
      expect(update({ ...settingsAtomInitialValue, theme: 'dark' })).toEqual({
        ...settingsAtomInitialValue,
        theme: 'dark',
        showSidebarLabels: value,
      });
    }
  });
});
