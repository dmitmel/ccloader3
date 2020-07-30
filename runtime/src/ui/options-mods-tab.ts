import { addEnumMember } from './utils.js';

ig.module('ccloader-runtime.ui.options.mods-tab')
  .requires(
    'impact.base.font',
    'game.feature.font.font-system',
    'game.feature.model.options-model',
    'game.feature.menu.gui.options.options-list',
  )
  .defines(() => {
    sc.fontsystem.font.pushIconSet(
      new ig.Font('mod://ccloader-runtime/media/icons.png', 16, ig.MultiFont.ICON_START),
      {
        mods: 0,
      },
    );

    addEnumMember(sc.OPTION_CATEGORY, 'MODS');

    sc.OptionsTabBox.prototype.tabs.mods = null!;
    sc.OptionsTabBox.inject({
      init(...args) {
        this.parent(...args);
        this.tabs.mods = this._createTabButton(
          'mods',
          this.tabArray.length,
          sc.OPTION_CATEGORY.MODS,
        );
        this._rearrangeTabs();
      },
    });
  });
