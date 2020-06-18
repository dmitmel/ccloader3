export enum PlatformType {
  Desktop = 'Desktop',
  Browser = 'Browser',
}

export const PLATFORM_TYPE =
  typeof require === 'function' ? PlatformType.Desktop : PlatformType.Browser;

export function showDevTools(): Promise<void> {
  return new Promise((resolve) =>
    // eslint-disable-next-line no-undefined
    nw.Window.get().showDevTools(undefined, () => resolve()),
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

/* eslint-enable @typescript-eslint/no-explicit-any */

export function hasKey(obj: unknown, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function mapGetOrInsert<K, V>(
  map: Map<K, V>,
  key: K,
  defaultValue: V,
): V {
  if (map.has(key)) {
    return map.get(key)!;
  } else {
    map.set(key, defaultValue);
    return defaultValue;
  }
}
