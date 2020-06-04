/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

import { getLocalizedString, getModTitle } from '../utils.js';

let langGui = ig.lang.labels.sc.gui;

let langOptions = langGui.options;

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

langGui.menu.option.mods = 'Mods';
langOptions['mods-description'] = {
  description:
    'In this menu you can \\c[3]enable or disable installed mods\\c[0]. Mod descriptions are shown below. \\c[1]The game needs to be restarted\\c[0] if you change any options here!',
};

for (let mod of modloader.installedMods.values()) {
  let { id, description } = mod.manifest;
  if (id === 'ccloader-runtime') continue;

  let name = getModTitle(mod) || ' ';
  description = getLocalizedString(description) || ' ';
  if (!('OptionInfoBox' in sc)) {
    description = `${description} \\c[1]Needs a restart!`;
  }

  langOptions[`modEnabled-${id}`] = { name, description };
}
