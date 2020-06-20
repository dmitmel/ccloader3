import * as modloader from './modloader.js';
import { showDevTools, wait } from '../common/dist/utils.js';

(async () => {
  let onloadPromise = new Promise((resolve) => {
    window.addEventListener('load', () => resolve());
  });

  if (typeof process !== 'undefined') {
    let { env } = process;

    if (env.CCLOADER_OPEN_DEVTOOLS) {
      delete env.CCLOADER_OPEN_DEVTOOLS;
      let win = nw.Window.get();
      await showDevTools();
      win.focus();
      await wait(500);
    }

    let urlOverride = env.CCLOADER_OVERRIDE_MAIN_URL;
    if (urlOverride) {
      delete env.CCLOADER_OVERRIDE_MAIN_URL;
      window.location.replace(urlOverride);
      return;
    }
  }

  await onloadPromise;
  await modloader.boot();
})();
