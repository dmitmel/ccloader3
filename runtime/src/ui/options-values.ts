ig.module('ccloader-runtime.ui.options.values')
  .requires('game.feature.model.options-model')
  .defines(() => {
    const modDataStorage = modloader._modDataStorage;

    sc.OptionModel.inject({
      // TODO: maybe rewrite this as a game addon?
      onStorageGlobalSave(globalsData, ...args) {
        let result = this.parent(globalsData, ...args);

        let { options } = globalsData;

        let logFlags = 0;
        logFlags |= Number(options['logLevel-log']) << 2;
        logFlags |= Number(options['logLevel-warn']) << 1;
        logFlags |= Number(options['logLevel-error']) << 0;
        localStorage.setItem('logFlags', String(logFlags));

        for (let [modID, mod] of modloader.installedMods) {
          if (mod !== modloader._runtimeMod) {
            modDataStorage.setModEnabled(modID, Boolean(options[`modEnabled-${modID}`]));
          }
        }
        modDataStorage.write().catch((err) => {
          console.warn(err);
        });

        return result;
      },
    });
  });
