import * as utils from '../../../common/dist/utils.js';

ig.module('ccloader-runtime.ui.options.definitions')
  .requires(
    'game.feature.model.options-model',
    'game.feature.menu.gui.options.options-types',
    'ccloader-runtime.ui.options.mods-tab',
  )
  .defines(() => {
    sc.OPTIONS_DEFINITION['logLevel-log'] = {
      type: 'CHECKBOX',
      cat: sc.OPTION_CATEGORY.GENERAL,
      init: false,
      restart: true,
      hasDivider: true,
      header: 'logLevel',
    };

    sc.OPTIONS_DEFINITION['logLevel-warn'] = {
      type: 'CHECKBOX',
      cat: sc.OPTION_CATEGORY.GENERAL,
      init: true,
      restart: true,
    };

    sc.OPTIONS_DEFINITION['logLevel-error'] = {
      type: 'CHECKBOX',
      cat: sc.OPTION_CATEGORY.GENERAL,
      init: true,
      restart: true,
    };

    if ('OptionInfoBox' in sc) {
      sc.OPTIONS_DEFINITION['mods-description'] = {
        type: 'INFO',
        cat: sc.OPTION_CATEGORY.MODS,
        data: 'options.mods-description.description',
        marginBottom: 6,
      };
    }

    let installedModIDs = [];
    for (let [modID, mod] of modloader.installedMods) {
      if (mod !== modloader._runtimeMod) installedModIDs.push(modID);
    }
    installedModIDs.sort((id1, id2) => utils.compare(id1, id2));

    for (let modID of installedModIDs) {
      sc.OPTIONS_DEFINITION[`modEnabled-${modID}`] = {
        type: 'CHECKBOX',
        cat: sc.OPTION_CATEGORY.MODS,
        init: true,
        restart: true,
        checkboxRightAlign: true,
      };
    }
  });
