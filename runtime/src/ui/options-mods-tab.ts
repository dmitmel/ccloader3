ig.module('ccloader-runtime.ui.options.mods-tab')
  .requires(
    'impact.base.font',
    'game.feature.font.font-system',
    'game.feature.model.options-model',
    'game.feature.menu.gui.options.options-list',
  )
  .defines(() => {
    let icons = new ig.Font('mod://ccloader-runtime/media/icons.png', 16, ig.MultiFont.ICON_START);
    let ourIconSetIndex = sc.fontsystem.font.iconSets.length;
    sc.fontsystem.font.iconSets.push(icons);
    sc.fontsystem.font.setMapping({
      mods: [ourIconSetIndex, 0],
    });

    (sc.OPTION_CATEGORY as { MODS: number }).MODS = Object.keys(sc.OPTION_CATEGORY).length;

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
