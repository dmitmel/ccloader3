export {};

ig[deobf.module]('ccloader-runtime.stdlib.options.gui')
  [deobf.requires]('game.feature.menu.gui.options.options-types')
  [deobf.defines](() => {
    if (deobf.OptionInfoBox in sc) {
      sc[deobf.OptionInfoBox][deobf.inject]({
        [deobf.init](...args) {
          this.parent(...args);
          let [option] = args;
          if (option.marginBottom != null) {
            this[deobf.hook].size.y += option.marginBottom;
          }
        },
      });
    }

    sc[deobf.OptionRow][deobf.inject]({
      [deobf.init](...args) {
        this.parent(...args);
        let option = this[deobf.option];
        if (option.type === 'CHECKBOX' && option.checkboxRightAlign) {
          let checkbox = this[deobf.typeGui] as sc.OPTION_GUIS_DEFS.CHECKBOX;
          checkbox.button[deobf.hook].align.x = ig[deobf.GUI_ALIGN][deobf.X_RIGHT];
          let additionalWidth = checkbox[deobf.hook].size.x - checkbox.button[deobf.hook].size.x;
          const lineHook = this[deobf.hook].children[1];
          const slopeHook = this[deobf.hook].children[2];
          lineHook.size.x += additionalWidth;
          slopeHook[deobf.pos].x += additionalWidth;
        }
      },
    });
  });
