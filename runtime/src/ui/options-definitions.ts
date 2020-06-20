sc[deobf.OPTIONS_DEFINITION]['logLevel-log'] = {
  type: 'CHECKBOX',
  [deobf.cat]: sc[deobf.OPTION_CATEGORY][deobf.GENERAL],
  [deobf.init]: false,
  [deobf.restart]: true,
  [deobf.hasDivider]: true,
  [deobf.header]: 'logLevel',
};

sc[deobf.OPTIONS_DEFINITION]['logLevel-warn'] = {
  type: 'CHECKBOX',
  [deobf.cat]: sc[deobf.OPTION_CATEGORY][deobf.GENERAL],
  [deobf.init]: true,
  [deobf.restart]: true,
};

sc[deobf.OPTIONS_DEFINITION]['logLevel-error'] = {
  type: 'CHECKBOX',
  [deobf.cat]: sc[deobf.OPTION_CATEGORY][deobf.GENERAL],
  [deobf.init]: true,
  [deobf.restart]: true,
};

if (deobf.OptionInfoBox in sc) {
  sc[deobf.OPTIONS_DEFINITION]['mods-description'] = {
    type: 'INFO',
    [deobf.cat]: sc[deobf.OPTION_CATEGORY].MODS,
    data: 'options.mods-description.description',
    marginBottom: 6,
  };
}

for (let modId of Array.from(modloader.installedMods.keys()).sort((id1, id2) =>
  id1.localeCompare(id2),
)) {
  if (modId === 'ccloader-runtime') continue;

  sc[deobf.OPTIONS_DEFINITION][`modEnabled-${modId}`] = {
    type: 'CHECKBOX',
    [deobf.cat]: sc[deobf.OPTION_CATEGORY].MODS,
    [deobf.init]: true,
    [deobf.restart]: true,
    checkboxRightAlign: true,
  };
}
