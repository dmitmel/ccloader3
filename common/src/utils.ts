/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */

export function showDevTools(): Promise<void> {
  return new Promise((resolve) =>
    // eslint-disable-next-line no-undefined
    nw.Window.get().showDevTools(undefined, () => resolve()),
  );
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function compare(a: any, b: any): number {
  return a > b ? 1 : a < b ? -1 : 0;
}

// TODO: mention somewhere in docs that modification of `TypeError`'s `message`
// doesn't work.
export function errorHasMessage(error: any): error is { message: string } {
  return typeof error.message === 'string';
}

export function errorHasCode(error: any): error is { code: string } {
  return typeof error.code === 'string';
}

export function hasOwnProperty(obj: unknown, property: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, property);
}
