const memory = new Map<string, string>();

function notify(
  callback: ((error: Error | null, result?: string | null) => void) | undefined,
  result?: string | null,
) {
  callback?.(null, result);
}

const appStorage = {
  async getItem(
    key: string,
    callback?: (error: Error | null, result?: string | null) => void,
  ) {
    const value = memory.get(key) ?? null;
    notify(callback, value);
    return value;
  },
  async setItem(
    key: string,
    value: string,
    callback?: (error: Error | null) => void,
  ) {
    memory.set(key, value);
    callback?.(null);
  },
  async removeItem(key: string, callback?: (error: Error | null) => void) {
    memory.delete(key);
    callback?.(null);
  },
  async mergeItem(
    key: string,
    value: string,
    callback?: (error: Error | null) => void,
  ) {
    memory.set(key, value);
    callback?.(null);
  },
  async clear(callback?: (error: Error | null) => void) {
    memory.clear();
    callback?.(null);
  },
  async getAllKeys(callback?: (error: Error | null, keys?: string[]) => void) {
    const keys = [...memory.keys()];
    callback?.(null, keys);
    return keys;
  },
  flushGetRequests() {},
  async multiGet(keys: string[]) {
    return keys.map((key) => [key, memory.get(key) ?? null] as const);
  },
  async multiSet(pairs: [string, string][]) {
    pairs.forEach(([key, value]) => memory.set(key, value));
  },
  async multiRemove(keys: string[]) {
    keys.forEach((key) => memory.delete(key));
  },
  async multiMerge(pairs: [string, string][]) {
    pairs.forEach(([key, value]) => memory.set(key, value));
  },
};

export default appStorage;
export const storageHub = {
  appStorage,
  _mockStorage: appStorage,
};
