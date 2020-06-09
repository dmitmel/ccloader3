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
