export {};

ig[deobf.module]('ccloader-runtime.ui.version-display')
  [deobf.requires](
    'game.feature.gui.base.text',
    'game.feature.gui.screen.title-screen',
    'game.feature.gui.screen.pause-screen',
  )
  [deobf.defines](() => {
    function attachCCLoaderVersionText(versionGui: sc.TextGui): sc.TextGui {
      const ccloaderVersionGui = new sc[deobf.TextGui](`CCLoader v${modloader.version}`, {
        font: sc[deobf.fontsystem][deobf.tinyFont],
      });
      ccloaderVersionGui[deobf.setAlign](
        versionGui[deobf.hook].align.x,
        versionGui[deobf.hook].align.y,
      );
      ccloaderVersionGui[deobf.setPos](0, versionGui[deobf.hook].size.y);
      versionGui[deobf.addChildGui](ccloaderVersionGui);
      return ccloaderVersionGui;
    }

    sc[deobf.TitleScreenGui][deobf.inject]({
      ccloaderVersionGui: null,

      [deobf.init](...args) {
        this.parent(...args);
        this.ccloaderVersionGui = attachCCLoaderVersionText(this[deobf.versionGui]);
      },
    });

    sc[deobf.PauseScreenGui][deobf.inject]({
      ccloaderVersionGui: null,

      [deobf.init](...args) {
        this.parent(...args);
        this.ccloaderVersionGui = attachCCLoaderVersionText(this[deobf.versionGui]);
      },
    });
  });
