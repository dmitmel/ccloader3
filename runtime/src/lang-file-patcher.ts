import * as impactModuleHooks from './impact-module-hooks.js';
import * as resources from './resources.js';

impactModuleHooks.add('game.config', () => {
  let builtinLocales = Object.keys(ig[deobf.LANG_DETAILS]);

  function getLangFilePath(feature: string, lang: string): string {
    return feature[deobf.toPath]('data/lang/', `.${lang}.json`);
  }

  ig[deobf.Lang][deobf.inject]({
    [deobf.loadInternal](...args) {
      let currentLang = ig[deobf.currentLang];
      if (currentLang !== 'en_US' && builtinLocales.includes(currentLang)) {
        for (let feature of ig[deobf.langFileList]) {
          resources.jsonPatches.add(getLangFilePath(feature, currentLang), {
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
