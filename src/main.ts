import * as modloader from './modloader.js';
import { showDevTools, wait } from './utils.js';

(async () => {
  let env = window.process?.env as NodeJS.ProcessEnv | undefined;

  let urlOverride = env?.CCLOADER_OVERRIDE_MAIN_URL;
  if (urlOverride) {
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
  await modloader.boot();
})();
