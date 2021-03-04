ig.module('ccloader-runtime.stdlib.options.gui')
  .requires('game.feature.menu.gui.options.options-types')
  .defines(() => {
    sc.OptionInfoBox.inject({
      init(...args) {
        this.parent(...args);
        let [option] = args;
        if (option.marginBottom != null) {
          this.hook.size.y += option.marginBottom;
        }
      },
    });

    sc.OptionRow.inject({
      iconGui: null,
      iconGfx: null,
      iconSettings: null,

      init(...args) {
        this.parent(...args);

        let lineHook = this.hook.children[1];
        let slopeHook = this.hook.children[2];

        if (this.option.icon != null) {
          let { icon } = this.option;
          this.iconSettings = icon;
          this.iconGui = new ig.ImageGui(
            new ig.Image(icon.path),
            icon.offsetX,
            icon.offsetY,
            icon.sizeX,
            icon.sizeY,
          );
          this.iconGui.setAlign(ig.GUI_ALIGN.X_LEFT, ig.GUI_ALIGN.Y_BOTTOM);
          this.iconGui.setPos(this.nameGui.hook.pos.x, lineHook.pos.y + 2);
          this.addChildGui(this.iconGui);
          this.nameGui.hook.pos.x += this.iconGui.hook.pos.x + this.iconGui.hook.size.x;
        }

        if (this.option.type === 'CHECKBOX' && this.option.checkboxRightAlign) {
          let checkbox = this.typeGui as sc.OPTION_GUIS_DEFS.CHECKBOX;
          checkbox.button.hook.align.x = ig.GUI_ALIGN.X_RIGHT;
          let additionalWidth = checkbox.hook.size.x - checkbox.button.hook.size.x;
          lineHook.size.x += additionalWidth;
          slopeHook.pos.x += additionalWidth;
        }
      },

      updateDrawables(renderer) {
        this.parent(renderer);
        if (this.iconGfx == null || this.iconSettings == null) return;
        renderer.addGfx(
          this.iconGfx,
          0,
          5,
          this.iconSettings.offsetX ?? 0,
          this.iconSettings.offsetY ?? 0,
          this.iconSettings.sizeX ?? this.iconGfx.width,
          this.iconSettings.sizeY ?? this.iconGfx.height,
        );
      },
    });
  });
