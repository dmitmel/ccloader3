export function showDevTools(): Promise<void> {
  return new Promise(resolve =>
    // eslint-disable-next-line no-undefined
    nw.Window.get().showDevTools(undefined, () => resolve()),
  );
}

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function compare(a: any, b: any): number {
  return a > b ? 1 : a < b ? -1 : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorHasMessage(error: any): error is { message: string } {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return typeof error.message === 'string';
}
