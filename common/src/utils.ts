// eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
declare var chrome: any;

export type MaybePromise<T> = T | Promise<T>;

export enum PlatformType {
  DESKTOP = 'DESKTOP',
  BROWSER = 'BROWSER',
}

export const PLATFORM_TYPE =
  typeof nw !== 'undefined' ? PlatformType.DESKTOP : PlatformType.BROWSER;

export function showDevTools(): Promise<void> {
  return new Promise((resolve) =>
    // eslint-disable-next-line no-undefined
    nw.Window.get().showDevTools(undefined, () => resolve()),
  );
}

export function showBackgroundPageDevTools(): Promise<void> {
  return new Promise((resolve) =>
    chrome.developerPrivate.openDevTools(
      {
        renderViewId: -1,
        renderProcessId: -1,
        extensionId: chrome.runtime.id,
      },
      () => resolve(),
    ),
  );
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function compare<T>(a: T, b: T): number {
  return a > b ? 1 : a < b ? -1 : 0;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// TODO: mention somewhere in docs that modification of `TypeError`'s `message`
// doesn't work.
export function errorHasMessage(error: any): error is { message: string } {
  return typeof error.message === 'string';
}

export function errorHasCode(error: any): error is { code: string } {
  return typeof error.code === 'string';
}

export type PromiseResult<T> = { type: 'resolved'; value: T } | { type: 'rejected'; reason: any };

/* eslint-enable @typescript-eslint/no-explicit-any */

export function wrapPromiseResult<T>(promise: Promise<T>): Promise<PromiseResult<T>> {
  return promise.then(
    (value) => ({ type: 'resolved', value }),
    (reason) => ({ type: 'rejected', reason }),
  );
}

export function hasKey(obj: unknown, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function mapGetOrInsert<K, V>(map: Map<K, V>, key: K, defaultValue: V): V {
  if (map.has(key)) {
    return map.get(key)!;
  } else {
    map.set(key, defaultValue);
    return defaultValue;
  }
}
