import * as consoleM from '../../../common/dist/console.js';

ig.module('ccloader-runtime.ui.options.values')
  .requires('game.feature.model.options-model')
  .defines(() => {
    sc.OptionModel.inject({
      // TODO: maybe rewrite this as a game addon?
      onStorageGlobalSave(globalsData, ...args) {
        let result = this.parent(globalsData, ...args);

        let { options } = globalsData;

        consoleM.setLogLevels({
          LOG: options['logLevel-log'],
          WARN: options['logLevel-warn'],
          ERROR: options['logLevel-error'],
        });

        const { modDataStorage } = modloader;
        for (let [modID, mod] of modloader.installedMods) {
          if (mod !== modloader._runtimeMod) {
            modDataStorage.setModEnabled(modID, Boolean(options[`modEnabled-${modID}`]));
          }
        }
        modDataStorage.write().catch((err) => {
          console.error('Failed to write mod data and settings:', err);
        });

        return result;
      },
    });
  });
