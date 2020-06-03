import * as files from './files.js';
import { Manifest, ManifestLegacy, ManifestUtil, ModId } from './manifest.js';
import { Mod, ModDependency, ModLoadingStage } from './mod.js';
import * as game from './game.js';
import { promises as fs } from './node-module-imports/_fs.js';
import { SemVer } from './node-module-imports/_semver.js';
import { compare, errorHasCode, errorHasMessage } from './utils.js';

export interface ModloaderAPI {
  readonly name: string;
  readonly version: SemVer;
  readonly gameVersion: SemVer;
  readonly installedMods: ReadonlyMap<ModId, Mod>;
  readonly loadedMods: ReadonlyMap<ModId, Mod>;
}

const api = {
  name: 'ccloader',
  version: new SemVer('3.0.0-alpha'),
  gameVersion: new SemVer('0.0.0'),
  installedMods: new Map<ModId, Mod>(),
  loadedMods: new Map<ModId, Mod>(),
};

export const publicAPI: ModloaderAPI = api;

export async function boot(): Promise<void> {
  console.log(`${api.name} v${api.version}`);

  await loadGameVersion();
  console.log(`crosscode v${api.gameVersion}`);

  await loadAllModMetadata('assets/mods');
  sortModsInLoadOrder();
  verifyModDependencies();
  for (let [modId, mod] of api.installedMods.entries()) {
    if (mod.shouldBeLoaded) api.loadedMods.set(modId, mod);
  }

  console.log(api.loadedMods);

  await initModClasses();

  await game.buildNecessaryDOM();

  await executeStage('preload');
  let domReadyCallback = await game.loadMainScript();
  await executeStage('postload');
  domReadyCallback();

  let startGame = await game.getStartFunction();
  await executeStage('prestart');
  startGame();
  await game.waitForIgGameInitialization();
  await executeStage('poststart');
}

async function loadGameVersion(): Promise<void> {
  let changelogText = await files.loadText('/assets/data/changelog.json');
  let { changelog } = JSON.parse(changelogText) as {
    changelog: Array<{ version: string }>;
  };
  let latestVersion = changelog[0].version;
  api.gameVersion = new SemVer(latestVersion);
}

async function loadAllModMetadata(modsDir: string): Promise<void> {
  let modsDirectoryContents: string[];

  try {
    modsDirectoryContents = await fs.readdir(modsDir);
  } catch (err) {
    if (errorHasCode(err) && err.code === 'ENOENT') {
      console.error(
        `Directory '${modsDir}' not found, did you forget to create it?`,
      );
      modsDirectoryContents = [];
    } else {
      throw err;
    }
  }

  await Promise.all(
    modsDirectoryContents.map(async name => {
      let fullPath = `${modsDir}/${name}`;
      try {
        // the `withFileTypes` option of `readdir` can't be used here because it
        // doesn't dereference symbolic links similarly to `stat`
        let stat = await fs.stat(fullPath);
        if (!stat.isDirectory()) return;
        let mod = await loadModMetadata(fullPath);
        if (mod == null) return;

        let { id } = mod.manifest;
        let modWithSameId = api.installedMods.get(id);
        if (modWithSameId != null) {
          throw new Error(
            `a mod with ID '${id}' has already been loaded from '${modWithSameId.baseDirectory}'`,
          );
        } else {
          api.installedMods.set(id, mod);
        }
      } catch (err) {
        console.error(
          `An error occured while loading the metadata of a mod in '${fullPath}':`,
          err,
        );
      }
    }),
  );
}

let manifestUtil = new ManifestUtil();

async function loadModMetadata(baseDirectory: string): Promise<Mod | null> {
  let manifestFile: string;
  let manifestText: string;
  let legacyMode = false;

  try {
    manifestFile = `/${baseDirectory}/ccmod.json`;
    manifestText = await files.loadText(manifestFile);
  } catch (_e1) {
    try {
      legacyMode = true;
      manifestFile = `/${baseDirectory}/package.json`;
      manifestText = await files.loadText(manifestFile);
    } catch (_e2) {
      return null;
    }
  }

  let manifestData: Manifest | ManifestLegacy;
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    manifestData = JSON.parse(manifestText);
  } catch (err) {
    if (errorHasMessage(err)) {
      err.message = `Syntax error in mod manifest in '${manifestFile}': ${err.message}`;
    }
    throw err;
  }

  try {
    if (legacyMode) {
      manifestData = manifestData as ManifestLegacy;
      manifestUtil.validateLegacy(manifestData);
      manifestData = manifestUtil.convertFromLegacy(manifestData);
    } else {
      manifestData = manifestData as Manifest;
      manifestUtil.validate(manifestData);
    }
  } catch (err) {
    if (errorHasMessage(err)) {
      err.message = `Invalid mod manifest in '${manifestFile}': ${err.message}`;
      // TODO: put a link to the documentation here
    }
    throw err;
  }

  return new Mod(`${baseDirectory}/`, manifestData, legacyMode);
}

function sortModsInLoadOrder(): void {
  // note that maps preserve insertion order as defined in the ECMAScript spec
  let orderedMods = new Map<ModId, Mod>();

  let unorderedModsList: Mod[] = Array.from(
    api.installedMods.values(),
  ).sort((mod1, mod2) => compare(mod1.manifest.id, mod2.manifest.id));

  while (unorderedModsList.length > 0) {
    // dependency cycles can be detected by checking if we removed any
    // dependencies in this iteration, although see the comment below
    let dependencyCyclesExist = true;

    for (let i = 0; i < unorderedModsList.length; ) {
      let mod = unorderedModsList[i];
      if (!modHasUnorderedInstalledDependencies(mod, orderedMods)) {
        unorderedModsList.splice(i, 1);
        orderedMods.set(mod.manifest.id, mod);
        dependencyCyclesExist = false;
      } else {
        i++;
      }
    }

    if (dependencyCyclesExist) {
      // Detection of **exactly** which mods caused this isn't implemented yet
      // because 2767mr said it isn't worth the effort (to which I agreed) for
      // now, but if you know how to do that - please implement. For anyone
      // interested google "circular dependency detection" or "detect graph edge
      // cycles" and you'll most likely find something useful for our case.
      throw new Error('Detected a dependency cycle');
    }
  }

  api.installedMods = orderedMods;
}

function modHasUnorderedInstalledDependencies(
  mod: Mod,
  orderedMods: Map<ModId, Mod>,
): boolean {
  for (let depId of mod.dependencies.keys()) {
    if (
      !orderedMods.has(depId) &&
      api.installedMods.has(depId) &&
      depId !== 'crosscode' &&
      depId !== 'ccloader'
    ) {
      return true;
    }
  }
  return false;
}

function verifyModDependencies(): void {
  for (let mod of api.installedMods.values()) {
    for (let [depId, dep] of mod.dependencies) {
      let problem = checkDependencyConstraint(depId, dep);
      if (problem != null) {
        mod.shouldBeLoaded = false;
        console.error(`Could not load mod '${mod.manifest.id}': ${problem}`);
        // not breaking out of the loop here, let's list potential problems with
        // other dependencies as well
      }
    }
  }
}

function checkDependencyConstraint(
  depId: ModId,
  depConstraint: ModDependency,
): string | null {
  let availableDepVersion: SemVer;
  let depTitle = depId;

  switch (depId) {
    case 'crosscode': {
      availableDepVersion = api.gameVersion;
      break;
    }

    case 'ccloader': {
      availableDepVersion = api.version;
      break;
    }

    default: {
      depTitle = `mod '${depId}'`;

      let depMod = api.installedMods.get(depId);
      if (depMod == null) {
        return depConstraint.optional ? null : `${depTitle} is not installed`;
      }

      if (!depMod.shouldBeLoaded) {
        return depConstraint.optional ? null : `${depTitle} is not loaded`;
      }

      availableDepVersion = depMod.version;
    }
  }

  if (!depConstraint.version.test(availableDepVersion)) {
    return `version of ${depTitle} (${availableDepVersion}) is not in range '${depConstraint.version}'`;
  }

  return null;
}

async function initModClasses(): Promise<void> {
  for (let mod of api.loadedMods.values()) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await mod.initClass();
    } catch (err) {
      console.error(
        `Failed to initialize class of mod '${mod.manifest.id}':`,
        err,
      );
    }
  }
}

async function executeStage(stage: ModLoadingStage): Promise<void> {
  for (let mod of api.loadedMods.values()) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await mod.executeStage(stage);
    } catch (err) {
      console.error(
        `Failed to execute ${stage} of mod '${mod.manifest.id}':`,
        err,
      );
    }
  }
}
