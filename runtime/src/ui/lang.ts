import { getLocalizedString, getModTitle } from './utils.js';

ccmod3.resources.jsonPatches.add('data/lang/sc/gui.en_US.json', (data) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { labels } = data as any;

  let langOptions = labels.options;

  langOptions.headers.logLevel = 'Log levels';
  langOptions['logLevel-log'] = {
    name: 'Log level: Default',
    description: 'Enables default message popups. \\c[1]Needs a restart!',
  };
  langOptions['logLevel-warn'] = {
    name: 'Log level: Warnings',
    description: 'Enables warning popups. \\c[1]Needs a restart!',
  };
  langOptions['logLevel-error'] = {
    name: 'Log level: Errors',
    description: 'Enables error popups. \\c[1]Needs a restart!',
  };

  labels.menu.option.mods = 'Mods';

  const INFO_BOX_IS_SUPPORTED = deobf.OptionInfoBox in sc;

  if (INFO_BOX_IS_SUPPORTED) {
    langOptions['mods-description'] = {
      description:
        'In this menu you can \\c[3]enable or disable installed mods\\c[0]. ' +
        'Mod descriptions are shown below. \\c[1]The game needs to be ' +
        'restarted\\c[0] if you change any options here!',
    };
  }

  for (let mod of modloader.installedMods.values()) {
    let { id, description } = mod.manifest;
    if (id === 'ccloader-runtime') continue;

    let name = getModTitle(mod) || ' ';
    description = getLocalizedString(description) || ' ';
    if (!INFO_BOX_IS_SUPPORTED) {
      description = `${description} \\c[1]Needs a restart!`;
    }

    langOptions[`modEnabled-${id}`] = { name, description };
  }
});
