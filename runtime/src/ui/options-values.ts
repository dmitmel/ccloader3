export {};

ig.module('ccloader-runtime.ui.options.values')
  .requires('game.feature.model.options-model')
  .defines(() => {
    sc.OptionModel.inject({
      // TODO: maybe rewrite this as a game addon?
      onStorageGlobalSave(globalsData, ...args) {
        let result = this.parent(globalsData, ...args);

        for (let key of Object.keys(localStorage)) {
          if (key.startsWith('modEnabled-')) {
            localStorage.removeItem(key);
          }
        }

        let { options } = globalsData;

        let logFlags = 0;
        logFlags |= Number(options['logLevel-log']) << 2;
        logFlags |= Number(options['logLevel-warn']) << 1;
        logFlags |= Number(options['logLevel-error']) << 0;
        localStorage.setItem('logFlags', String(logFlags));

        for (let key of Object.keys(options)) {
          if (key.startsWith('modEnabled-')) {
            localStorage.setItem(key, String(options[key]));
          }
        }

        return result;
      },
    });
  });
