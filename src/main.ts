import * as modloader from './modloader.js';
import { showDevTools, wait } from './utils.js';

declare global {
  // eslint-disable-next-line no-var
  var modloader: modloader.ModloaderAPI;
}

(async () => {
  let env = window.process?.env as NodeJS.ProcessEnv | undefined;

  let urlOverride = env?.CCLOADER_OVERRIDE_MAIN_URL;
  if (urlOverride) {
    delete env?.CCLOADER_OVERRIDE_MAIN_URL;
    window.location.replace(urlOverride);
    return;
  }

  let onloadPromise = new Promise(resolve =>
    window.addEventListener('load', () => resolve()),
  );

  if (env?.CCLOADER_OPEN_DEVTOOLS) {
    await showDevTools();
    await wait(500);
  }

  await onloadPromise;
  window.modloader = modloader.publicAPI;

  await modloader.boot();
})();
