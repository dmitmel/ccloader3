ig[deobf.module]('ccloader-runtime.ui.options.mods-tab')
  [deobf.requires](
    'impact.base.font',
    'game.feature.font.font-system',
    'game.feature.model.options-model',
    'game.feature.menu.gui.options.options-list',
  )
  [deobf.defines](() => {
    let icons = new ig[deobf.Font](
      'mod://ccloader-runtime/media/icons.png',
      16,
      ig[deobf.MultiFont][deobf.ICON_START],
    );
    let ourIconSetIndex = sc[deobf.fontsystem].font[deobf.iconSets].length;
    sc[deobf.fontsystem].font[deobf.iconSets].push(icons);
    sc[deobf.fontsystem].font[deobf.setMapping]({
      mods: [ourIconSetIndex, 0],
    });

    (sc[deobf.OPTION_CATEGORY] as { MODS: number }).MODS = Object.keys(
      sc[deobf.OPTION_CATEGORY],
    ).length;

    sc[deobf.OptionsTabBox].prototype[deobf.tabs].mods = null!;
    sc[deobf.OptionsTabBox][deobf.inject]({
      [deobf.init](...args) {
        this.parent(...args);
        this[deobf.tabs].mods = this[deobf._createTabButton](
          'mods',
          this[deobf.tabArray].length,
          sc[deobf.OPTION_CATEGORY].MODS,
        );
        this[deobf._rearrangeTabs]();
      },
    });
  });
