import { GAME_ASSETS_URL, MOD_PROTOCOL_PREFIX } from './resources.constants.js';
import * as impactInitHooks from './impact-init-hooks.js';
import * as impactModuleHooks from './impact-module-hooks.js';

impactInitHooks.add(() => {
  $.ajaxSetup({
    beforeSend(_jqXhr: JQueryXHR, settings: JQueryAjaxSettings): boolean {
      if (settings.dataType !== 'json' || settings.type !== 'GET') {
        return true;
      }

      let { url } = settings;
      if (typeof url !== 'string') return true;

      if (!url.startsWith(MOD_PROTOCOL_PREFIX)) {
        let parsedUrl = new URL(url, document.baseURI).href;
        if (!parsedUrl.startsWith(GAME_ASSETS_URL.href)) {
          return true;
        }
      }

      let cacheSuffix = ig.getCacheSuffix();
      if (cacheSuffix.length > 0 && url.endsWith(cacheSuffix)) {
        url = url.slice(0, -cacheSuffix.length);
      }

      let { context, success, error, complete } = settings;
      delete settings.success;
      delete settings.error;
      delete settings.complete;
      ccmod3.resources
        .loadJSONPatched(url)
        .then(
          (data) => {
            if (success != null) {
              success.call(context, data, 'hijacked', null!);
            }
          },
          (err) => {
            // errors aren't really handled by the game though
            if (error != null) {
              error.call(context, null!, 'hijacked', err);
            }
          },
        )
        .finally(() => {
          if (complete != null) {
            complete.call(context, null!, 'hijacked');
          }
        });

      return false;
    },
  });
});

impactModuleHooks.add('impact.base.image', () => {
  ig.Image.inject({
    loadInternal(path) {
      // Some image paths include trailing whitespace which the devs didn't
      // notice because JS automatically trims whitespace (note: encoded
      // whitespace, i.e. `%20`-like entities, are left untouched) in URLs. I'm
      // assuming that there are no such JSON paths because JQuery automatically
      // encodes URIs before requesting and there are no instances of leading
      // whitespace because `ig.root` is not empty in the development version.
      path = path.trimRight();
      ccmod3.resources
        .loadImagePatched(ig.getFilePath(`${ig.root}${path}`))
        .then(
          (img) => {
            this.data = img;
            this.onload();
          },
          (_err) => {
            this.onerror();
          },
        );
    },

    // the default implementation appends a query with the current date in
    // milliseconds instead of using `ig.getCacheSuffix()` because reloading was
    // implemented for images before a more general reload system,
    // `ig.Loadable#reload` existed, so let's fix this by calling the default
    // implementation
    debugReload: true,
    reload() {
      // I kinda gave up fixing the `ImpactClass` here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ig.Loadable.prototype.reload.call(this as any);
    },
  });
});

impactModuleHooks.add('impact.base.sound', () => {
  function loadAudio<
    Ret,
    Args extends [string, ...unknown[]],
    This extends { parent(this: This, ...args: Args): Ret }
  >(this: This, ...args: Args): Ret {
    let path = args[0];

    let pathWithoutExt = path;
    let lastDotIndex = pathWithoutExt.lastIndexOf('.');
    if (lastDotIndex >= 0) {
      pathWithoutExt = pathWithoutExt.slice(0, lastDotIndex);
    }

    let resolvedURL = ig.getFilePath(
      `${ig.root}${pathWithoutExt}.${ig.soundManager.format.ext}`,
    );
    resolvedURL = ccmod3.resources.resolveURL(resolvedURL);

    let originalGetFilePath = ig.getFilePath;
    try {
      ig.getFilePath = (_path) => resolvedURL;
      return this.parent(...args);
    } finally {
      ig.getFilePath = originalGetFilePath;
    }
  }

  ig.SoundManager.inject({
    loadWebAudio: loadAudio,
    load: loadAudio,
  });
});
