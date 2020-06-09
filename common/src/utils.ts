export enum PlatformType {
	Desktop = 'Desktop',
	Browser = 'Browser',
}

export const PLATFORM_TYPE = typeof require === 'function' ? PlatformType.Desktop : PlatformType.Browser;

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

// TODO: mention somewhere in docs that modification of `TypeError`'s `message`
// doesn't work.
export function errorHasMessage(error: unknown): error is { message: string } {
	return typeof error === 'object' && error != null && 'message' in error && typeof (error as { message: unknown }).message === 'string';
}

export function errorHasCode(error: unknown): error is { code: string } {
	return typeof error === 'object' && error != null && 'code' in error && typeof (error as { code: unknown }).code === 'string';
}

export function hasKey(obj: unknown, key: PropertyKey): boolean {
	return Object.prototype.hasOwnProperty.call(obj, key);
}
