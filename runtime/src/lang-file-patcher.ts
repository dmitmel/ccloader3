import * as impactModuleHooks from './impact-module-hooks.js';
import * as resources from './resources.js';

impactModuleHooks.add('game.config', () => {
  const BUILTIN_LOCALES = Object.keys(ig.LANG_DETAILS);
  const DEFAULT_LOCALE = 'en_US';

  function getLangFilePath(feature: string, locale: string): string {
    return feature.toPath('data/lang/', `.${locale}.json`);
  }

  ig.Lang.inject({
    loadInternal(...args) {
      for (let locale of BUILTIN_LOCALES) {
        if (locale === DEFAULT_LOCALE) continue;

        for (let feature of ig.langFileList) {
          resources.jsonPatches.add(getLangFilePath(feature, locale), {
            dependencies: () => resources.loadJSON(getLangFilePath(feature, DEFAULT_LOCALE)),
            // eslint-disable-next-line no-loop-func
            patcher: (data, englishData) =>
              ig.merge(/* original */ englishData, /* new */ data, /* noArrayMerge */ true),
          });
        }
      }

      return this.parent(...args);
    },
  });
});
