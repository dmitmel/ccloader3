import * as files from './files.js';
import * as configM from './config.js';
import * as manifestM from './manifest.js';
import { Mod } from './mod.js';
import * as game from './game.js';
import * as semver from '../common/vendor-libs/semver.js';
import * as utils from '../common/dist/utils.js';
import * as paths from '../common/dist/paths.js';
import * as dependencyResolver from './dependency-resolver.js';
import * as modDataStorage from './mod-data-storage.js';
import { LegacyManifest, Manifest } from 'ultimate-crosscode-typedefs/file-types/mod-manifest';
import { LoadingStage, ModID } from 'ultimate-crosscode-typedefs/modloader/mod';

type ModsMap = Map<ModID, Mod>;
type ReadonlyModsMap = ReadonlyMap<ModID, Mod>;

// ends with a slash
const CCLOADER_DIR: string = paths.stripRoot(new URL('../', import.meta.url).pathname);

export async function boot(): Promise<void> {
  let modloaderMetadata = await loadModloaderMetadata();
  console.log(`${modloaderMetadata.name} ${modloaderMetadata.version}`);

  let config = await configM.load(modloaderMetadata.name, modloaderMetadata.version);

  let { version: gameVersion, hotfix: gameVersionHotfix } = await game.loadVersion(config);
  console.log(`crosscode ${gameVersion}-${gameVersionHotfix}`);

  try {
    await modDataStorage.readImmediately();
  } catch (err) {
    if (utils.errorHasMessage(err)) {
      err.message = `Failed to read mod data storage: ${err.message}`;
    }
    throw err;
  }

  let runtimeModBaseDirectory = `${CCLOADER_DIR}runtime`;
  let runtimeMod: Mod | null;
  try {
    // the runtime mod is added to `installedMods` in `sortModsInLoadOrder`
    runtimeMod = await loadModMetadata(runtimeModBaseDirectory);
    if (!(runtimeMod != null)) {
      throw new Error('Assertion failed: runtimeMod != null');
    }
  } catch (err) {
    if (utils.errorHasMessage(err)) {
      err.message = `Failed to load metadata of the runtime mod in '${runtimeModBaseDirectory}', please check if you installed CCLoader correctly! ${err.message}`;
    }
    throw err;
  }

  let installedMods = new Map<ModID, Mod>();
  installedMods.set(runtimeMod.manifest.id, runtimeMod);
  for (let dir of config.modsDirs) {
    await loadAllModMetadata(dir, installedMods);
  }
  installedMods = dependencyResolver.sortModsInLoadOrder(runtimeMod, installedMods);

  let loadedMods = new Map<ModID, Mod>();
  let loadedModsSetupPromises: Array<Promise<void>> = [];

  let virtualPackages = new Map<ModID, semver.SemVer>()
    .set('crosscode', gameVersion)
    .set(modloaderMetadata.name, modloaderMetadata.version);

  for (let [modID, mod] of installedMods) {
    if (mod !== runtimeMod && !modDataStorage.isModEnabled(modID)) {
      continue;
    }

    let dependencyProblems = dependencyResolver.verifyModDependencies(
      mod,
      installedMods,
      virtualPackages,
      loadedMods,
    );
    if (dependencyProblems.length > 0) {
      for (let problem of dependencyProblems) {
        console.error(`Problem with requirements of mod '${modID}': ${problem}`);
      }
      continue;
    }

    loadedMods.set(modID, mod);
    loadedModsSetupPromises.push(
      mod.findAllAssets().catch((err) => {
        console.error(`An error occured while searching assets of mod '${modID}':`, err);
      }),
    );
  }

  if (!loadedMods.has(runtimeMod.manifest.id)) {
    throw new Error('Could not load the runtime mod, game initialization is impossible!');
  }

  await Promise.all(loadedModsSetupPromises);

  console.log(loadedMods);

  window.modloader = {
    name: modloaderMetadata.name,
    version: modloaderMetadata.version,
    gameVersion,
    gameVersionHotfix,
    installedMods,
    loadedMods,
    modDataStorage,
    Mod: {},
    _runtimeMod: runtimeMod,
  };

  await game.buildNecessaryDOM(config);

  await initModClasses(loadedMods);

  await executeStage(loadedMods, 'preload');
  let domReadyCallback = await game.loadMainScript(
    config,
    runtimeMod.mainClassInstance as import('../runtime/src/_main').default,
  );
  await executeStage(loadedMods, 'postload');
  domReadyCallback();

  let startGame = await game.getStartFunction();
  await executeStage(loadedMods, 'prestart');
  startGame();
  await game.waitForIgGameInitialization();
  // TODO: delay further game initialization until poststart is complete
  await executeStage(loadedMods, 'poststart');
}

async function loadModloaderMetadata(): Promise<{
  name: string;
  version: semver.SemVer;
}> {
  let toolJsonText = await files.loadText(`${CCLOADER_DIR}tool.config.json`);
  let data = JSON.parse(toolJsonText) as { name: string; version: string };
  return { name: data.name, version: new semver.SemVer(data.version) };
}

async function loadAllModMetadata(modsDir: string, installedMods: ModsMap): Promise<void> {
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

let manifestValidator = new manifestM.Validator();

async function loadModMetadata(baseDirectory: string): Promise<Mod | null> {
  let manifestFile: string;
  let manifestText: string;
  let legacyMode = false;

  try {
    manifestFile = `${baseDirectory}/ccmod.json`;
    manifestText = await files.loadText(manifestFile);
  } catch (_e1) {
    try {
      legacyMode = true;
      manifestFile = `${baseDirectory}/package.json`;
      manifestText = await files.loadText(manifestFile);
    } catch (_e2) {
      return null;
    }
  }

  let manifestData: Manifest | LegacyManifest;
  try {
    manifestData = JSON.parse(manifestText);
  } catch (err) {
    if (utils.errorHasMessage(err)) {
      err.message = `Syntax error in mod manifest in '${manifestFile}': ${err.message}`;
    }
    throw err;
  }

  try {
    if (legacyMode) {
      manifestData = manifestData as LegacyManifest;
      manifestValidator.validateLegacy(manifestData);
      manifestData = manifestM.convertFromLegacy(manifestData);
    } else {
      manifestData = manifestData as Manifest;
      manifestValidator.validate(manifestData);
    }
  } catch (err) {
    if (utils.errorHasMessage(err)) {
      err.message = `Invalid mod manifest in '${manifestFile}': ${err.message}`;
      // TODO: put a link to the documentation here
    }
    throw err;
  }

  return new Mod(`${baseDirectory}/`, manifestData, legacyMode);
}

async function initModClasses(mods: ReadonlyModsMap): Promise<void> {
  for (let mod of mods.values()) {
    try {
      await mod.initClass();
    } catch (err) {
      console.error(`Failed to initialize class of mod '${mod.manifest.id}':`, err);
    }
  }
}

async function executeStage(mods: ReadonlyModsMap, stage: LoadingStage): Promise<void> {
  for (let mod of mods.values()) {
    try {
      await mod.executeStage(stage);
    } catch (err) {
      console.error(`Failed to execute ${stage} of mod '${mod.manifest.id}':`, err);
    }
  }
}
