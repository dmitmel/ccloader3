ig.module('ccloader-runtime.stdlib.options.gui')
  .requires('game.feature.menu.gui.options.options-types')
  .defines(() => {
    if ('OptionInfoBox' in sc) {
      sc.OptionInfoBox.inject({
        init(...args) {
          this.parent(...args);
          let [option] = args;
          if (option.marginBottom) {
            this.hook.size.y += option.marginBottom;
          }
        },
      });
    }

    sc.OptionRow.inject({
      init(...args) {
        this.parent(...args);
        if (this.option.type === 'CHECKBOX' && this.option.checkboxRightAlign) {
          let checkbox = this.typeGui as sc.OPTION_GUIS_DEFS.CHECKBOX;
          checkbox.button.hook.align.x = ig.GUI_ALIGN.X_RIGHT;
          let additionalWidth = checkbox.hook.size.x - checkbox.button.hook.size.x;
          const lineHook = this.hook.children[1];
          const slopeHook = this.hook.children[2];
          lineHook.size.x += additionalWidth;
          slopeHook.pos.x += additionalWidth;
        }
      },
    });
  });
