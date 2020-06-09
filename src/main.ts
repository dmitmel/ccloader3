import * as modloader from './modloader.js';
import { showDevTools, wait } from '../common/dist/utils.js';

(async () => {
	const env = window.process?.env as NodeJS.ProcessEnv | undefined;

	const urlOverride = env?.CCLOADER_OVERRIDE_MAIN_URL;
	if (urlOverride) {
		delete env?.CCLOADER_OVERRIDE_MAIN_URL;
		window.location.replace(urlOverride);
		return;
	}

	const onloadPromise = new Promise((resolve) =>
		window.addEventListener('load', () => resolve()),
	);

	if (env?.CCLOADER_OPEN_DEVTOOLS) {
		const win = nw.Window.get();
		await showDevTools();
		win.focus();
		await wait(500);
	}

	await onloadPromise;

	await modloader.boot();
})();
