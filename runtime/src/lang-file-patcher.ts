import * as impactModuleHooks from './impact-module-hooks.js';
import * as resources from './resources.js';

impactModuleHooks.add('game.config', () => {
  let builtinLocales = Object.keys(ig.LANG_DETAILS);

  function getLangFilePath(feature: string, lang: string): string {
    return feature.toPath('data/lang/', `.${lang}.json`);
  }

  ig.Lang.inject({
    loadInternal(...args) {
      if (ig.currentLang !== 'en_US' && builtinLocales.includes(ig.currentLang)) {
        for (let feature of ig.langFileList) {
          resources.jsonPatches.add(getLangFilePath(feature, ig.currentLang), {
            dependencies: () => resources.loadJSON(getLangFilePath(feature, 'en_US')),
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
