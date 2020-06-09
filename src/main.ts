import * as modloader from './modloader.js';
import * as utils from '../common/dist/utils.js';

main().catch((err) => console.error('Error in main: ', err));

async function main(): Promise<void> {
	if (redirect()) {
		return;
	}

	const onloadPromise = getOnloadPromise();
	await openDevTools();
	await onloadPromise;

	await modloader.boot();
}

function redirect(): boolean {
	const env = window.process?.env as NodeJS.ProcessEnv | undefined;
	const urlOverride = env?.CCLOADER_OVERRIDE_MAIN_URL;
	if (urlOverride) {
		delete env?.CCLOADER_OVERRIDE_MAIN_URL;
		window.location.replace(urlOverride);
		return true;
	}

	return false;
}

function getOnloadPromise(): Promise<void> {
	return new Promise((resolve) => window.addEventListener('load', () => resolve()));
}

async function openDevTools(): Promise<void> {
	const env = window.process?.env as NodeJS.ProcessEnv | undefined;
	if (env?.CCLOADER_OPEN_DEVTOOLS) {
		const win = nw.Window.get();
		await utils.showDevTools();
		win.focus();
		await utils.wait(500);
	}
}
