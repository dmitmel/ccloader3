import * as impactModuleHooks from './impact-module-hooks.js';
import { loadImagePatched, loadJSONPatched } from './resources.js';
import { GAME_ASSETS_URL, MOD_PROTOCOL_PREFIX } from './resources.constants.js';

$.ajaxSetup({
  beforeSend(_jqXhr: JQueryXHR, settings: JQueryAjaxSettings): boolean {
    if (settings.dataType !== 'json' || settings.type !== 'GET') return true;

    let { url } = settings;
    if (typeof url !== 'string') return true;

    if (!url.startsWith(MOD_PROTOCOL_PREFIX)) {
      let parsedUrl = new URL(url, GAME_ASSETS_URL).href;
      if (!parsedUrl.startsWith(GAME_ASSETS_URL.href)) return true;
    }

    let { context, success, error, complete } = settings;
    delete settings.success;
    delete settings.error;
    delete settings.complete;
    loadJSONPatched(url)
      .then(
        (data) => {
          if (success != null) success.call(context, data, 'hijacked', null!);
        },
        (err) => {
          // errors aren't really handled by the game though
          if (error != null) error.call(context, null!, 'hijacked', err);
        },
      )
      .finally(() => {
        if (complete != null) complete.call(context, null!, 'hijacked');
      });

    return false;
  },
});

impactModuleHooks.add('impact.base.image', () => {
  ig.Image.inject({
    loadInternal(path) {
      loadImagePatched(
        ig.getFilePath(`${ig.root}${path}${ig.getCacheSuffix()}`),
      ).then(
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
      // I kinda gave up fixing `ImpactClass` here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ig.Loadable.prototype.reload.call(this as any);
    },
  });
});

impactModuleHooks.add('impact.base.sound', () => {
  ig.SoundManager.inject({
    loadWebAudio(path, ...args) {
      return this.parent(path, ...args);
    },
  });
});
