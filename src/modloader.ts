import * as files from './files.js';
import { Manifest, ManifestLegacy, ModId } from './public/manifest';
import {
  ManifestValidator,
  convertFromLegacy as convertManifestFromLegacy,
} from './manifest.js';
import { ModDependency, ModLoadingStage } from './public/mod';
import { Mod } from './mod.js';
import * as game from './game.js';
import { SemVer } from '../common/vendor-libs/semver.js';
import { compare, errorHasMessage } from '../common/dist/utils.js';
import * as paths from '../common/dist/paths.js';

const CCLOADER_DIR: string = paths.stripRoot(
  paths.dirname(paths.dirname(new URL(import.meta.url).pathname)),
);

type ModsMap = Map<ModId, Mod>;
type ReadonlyModsMap = ReadonlyMap<ModId, Mod>;
type ReadonlyVirtualPackagesMap = ReadonlyMap<ModId, SemVer>;

export async function boot(): Promise<void> {
  let modloaderMetadata = await loadModloaderMetadata();

  console.log(`${modloaderMetadata.name} ${modloaderMetadata.version}`);

  let gameVersion = await loadGameVersion();
  console.log(`crosscode ${gameVersion}`);

  let runtimeModBaseDirectory = `${CCLOADER_DIR}/runtime`;
  let runtimeMod: Mod | null;
  try {
    // the runtime mod is added to `installedMods` in `sortModsInLoadOrder`
    runtimeMod = await loadModMetadata(runtimeModBaseDirectory);
    if (runtimeMod == null) {
      throw new Error('Assertion failed: runtimeMod != null');
    }
  } catch (err) {
    console.error(
      `Failed to load metadata of the runtime mod in '${runtimeModBaseDirectory}', please check if you installed CCLoader correctly!`,
      err,
    );
    return;
  }

  let installedMods = new Map<ModId, Mod>();
  await loadAllModMetadata('assets/mods', installedMods);
  installedMods = sortModsInLoadOrder(runtimeMod, installedMods);

  let virtualPackages = new Map<ModId, SemVer>();
  virtualPackages.set('crosscode', gameVersion);
  virtualPackages.set('ccloader', modloaderMetadata.version);
  verifyModDependencies(installedMods, virtualPackages);
  if (!runtimeMod.shouldBeLoaded) {
    throw new Error(
      'Could not load the runtime mod, game initialization is impossible!',
    );
  }

  let loadedMods = new Map<ModId, Mod>();
  let findAssetsPromises: Array<Promise<void>> = [];
  for (let [modId, mod] of installedMods.entries()) {
    if (mod.shouldBeLoaded) {
      loadedMods.set(modId, mod);

      findAssetsPromises.push(
        mod.findAllAssets().catch((err) => {
          console.error(
            `An error occured while searching assets of mod '${mod.manifest.id}':`,
            err,
          );
        }),
      );
    }
  }
  await Promise.all(findAssetsPromises);

  console.log(loadedMods);

  window.modloader = {
    name: modloaderMetadata.name,
    version: modloaderMetadata.version,
    gameVersion,
    installedMods,
    loadedMods,
  };

  await game.buildNecessaryDOM();

  await initModClasses(loadedMods);

  await executeStage(loadedMods, 'preload');
  let domReadyCallback = await game.loadMainScript();
  await executeStage(loadedMods, 'postload');
  domReadyCallback();

  let startGame = await game.getStartFunction();
  await executeStage(loadedMods, 'prestart');
  startGame();
  await game.waitForIgGameInitialization();
  await executeStage(loadedMods, 'poststart');
}

async function loadModloaderMetadata(): Promise<{
  name: string;
  version: SemVer;
}> {
  let toolJsonText = await files.loadFile(`${CCLOADER_DIR}/tool.json`);
  let data = JSON.parse(toolJsonText) as { name: string; version: string };
  return { name: data.name, version: new SemVer(data.version) };
}

async function loadGameVersion(): Promise<SemVer> {
  let changelogText = await files.loadFile('assets/data/changelog.json');
  let { changelog } = JSON.parse(changelogText) as {
    changelog: Array<{ version: string }>;
  };
  let latestVersion = changelog[0].version;
  return new SemVer(latestVersion);
}

async function loadAllModMetadata(
  modsDir: string,
  // this map is passed as an argument for support of multiple mod directories
  // in the future
  installedMods: ModsMap,
): Promise<void> {
  await Promise.all(
    (await files.getModDirectoriesIn(modsDir)).map(async (fullPath) => {
      try {
        let mod = await loadModMetadata(fullPath);
        if (mod == null) return;

        let { id } = mod.manifest;
        let modWithSameId = installedMods.get(id);
        if (modWithSameId != null) {
          throw new Error(
            `a mod with ID '${id}' has already been loaded from '${modWithSameId.baseDirectory}'`,
          );
        } else {
          installedMods.set(id, mod);
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

let manifestValidator = new ManifestValidator();

async function loadModMetadata(baseDirectory: string): Promise<Mod | null> {
  let manifestFile: string;
  let manifestText: string;
  let legacyMode = false;

  try {
    manifestFile = `${baseDirectory}/ccmod.json`;
    manifestText = await files.loadFile(manifestFile);
  } catch (_e1) {
    try {
      legacyMode = true;
      manifestFile = `${baseDirectory}/package.json`;
      manifestText = await files.loadFile(manifestFile);
    } catch (_e2) {
      return null;
    }
  }

  let manifestData: Manifest | ManifestLegacy;
  try {
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
      manifestValidator.validateLegacy(manifestData);
      manifestData = convertManifestFromLegacy(manifestData);
    } else {
      manifestData = manifestData as Manifest;
      manifestValidator.validate(manifestData);
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

function sortModsInLoadOrder(
  runtimeMod: Mod,
  installedMods: ReadonlyModsMap,
): ModsMap {
  // note that maps preserve insertion order as defined in the ECMAScript spec
  let sortedMods = new Map<ModId, Mod>();

  sortedMods.set(runtimeMod.manifest.id, runtimeMod);

  let unsortedModsList: Mod[] = Array.from(
    installedMods.values(),
  ).sort((mod1, mod2) => compare(mod1.manifest.id, mod2.manifest.id));

  while (unsortedModsList.length > 0) {
    // dependency cycles can be detected by checking if we removed any
    // dependencies in this iteration, although see the comment below
    let dependencyCyclesExist = true;

    for (let i = 0; i < unsortedModsList.length; ) {
      let mod = unsortedModsList[i];
      if (
        !modHasUnsortedInstalledDependencies(mod, sortedMods, installedMods)
      ) {
        unsortedModsList.splice(i, 1);
        sortedMods.set(mod.manifest.id, mod);
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

  return sortedMods;
}

function modHasUnsortedInstalledDependencies(
  mod: Mod,
  sortedMods: ReadonlyModsMap,
  installedMods: ReadonlyModsMap,
): boolean {
  for (let depId of mod.dependencies.keys()) {
    if (!sortedMods.has(depId) && installedMods.has(depId)) return true;
  }
  return false;
}

function verifyModDependencies(
  installedMods: ReadonlyModsMap,
  virtualPackages: ReadonlyVirtualPackagesMap,
): void {
  for (let mod of installedMods.values()) {
    for (let [depId, dep] of mod.dependencies) {
      let problem = checkDependencyConstraint(
        depId,
        dep,
        installedMods,
        virtualPackages,
      );
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
  installedMods: ReadonlyModsMap,
  virtualPackages: ReadonlyVirtualPackagesMap,
): string | null {
  let availableDepVersion: SemVer;
  let depTitle = depId;

  let virtualPackageVersion = virtualPackages.get(depId);
  if (virtualPackageVersion != null) {
    availableDepVersion = virtualPackageVersion;
  } else {
    depTitle = `mod '${depId}'`;

    let depMod = installedMods.get(depId);
    if (depMod == null) {
      return depConstraint.optional ? null : `${depTitle} is not installed`;
    }

    if (!depMod.shouldBeLoaded) {
      return depConstraint.optional ? null : `${depTitle} is not loaded`;
    }

    availableDepVersion = depMod.version;
  }

  if (!depConstraint.version.test(availableDepVersion)) {
    return `version of ${depTitle} (${availableDepVersion}) is not in range '${depConstraint.version}'`;
  }

  return null;
}

async function initModClasses(mods: ReadonlyModsMap): Promise<void> {
  for (let mod of mods.values()) {
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

async function executeStage(
  mods: ReadonlyModsMap,
  stage: ModLoadingStage,
): Promise<void> {
  for (let mod of mods.values()) {
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
