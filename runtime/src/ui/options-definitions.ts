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

    for (let modID of Array.from(modloader.installedMods.keys()).sort((id1, id2) =>
      id1.localeCompare(id2),
    )) {
      if (modID === modloader._runtimeMod.manifest.id) continue;

      sc.OPTIONS_DEFINITION[`modEnabled-${modID}`] = {
        type: 'CHECKBOX',
        cat: sc.OPTION_CATEGORY.MODS,
        init: true,
        restart: true,
        checkboxRightAlign: true,
      };
    }
  });
