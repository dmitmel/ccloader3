declare namespace sc {
  enum OPTION_CATEGORY {
    MODS = 8,
  }

  namespace OptionsTabBox {
    interface Tabs {
      mods: sc.ItemTabbedBox.TabButton;
    }
  }

  namespace OPTIONS_DEFINITION {
    interface KnownTypesMap {
      'logLevel-log': sc.OptionDefinition.CHECKBOX;
      'logLevel-warn': sc.OptionDefinition.CHECKBOX;
      'logLevel-error': sc.OptionDefinition.CHECKBOX;
      'mods-description': sc.OptionDefinition.INFO;
    }
  }
}
