import * as files from './files.js';
import * as configM from './config.js';
import * as manifestM from './manifest.js';
import { Mod } from './mod.js';
import * as game from './game.js';
import semver from '../common/vendor-libs/semver.js';
import * as utils from '../common/dist/utils.js';
import * as dependencyResolver from './dependency-resolver.js';
import * as modDataStorage from './mod-data-storage.js';
import { LegacyManifest, Manifest } from 'ultimate-crosscode-typedefs/file-types/mod-manifest';
import { LoadingStage, ModID } from 'ultimate-crosscode-typedefs/modloader/mod';
import * as consoleM from '../common/dist/console.js';
import * as zip from './zip.js';

type ModsMap = Map<ModID, Mod>;
type ReadonlyModsMap = ReadonlyMap<ModID, Mod>;

const CCLOADER_DIR = utils.cwdFilePathFromURL(new URL('../', import.meta.url));

export async function boot(): Promise<void> {
  consoleM.inject();

  let modloaderMetadata = await loadModloaderMetadata();
  console.log(`${modloaderMetadata.name} ${modloaderMetadata.version}`);

  let config = await configM.load(modloaderMetadata.name, modloaderMetadata.version);

  try {
    await modDataStorage.readImmediately();
  } catch (err) {
    if (utils.errorHasMessage(err)) {
      err.message = `Failed to read mod data storage: ${err.message}`;
    }
    throw err;
  }
  console.log(`loaded mod data storage and settings, ${modDataStorage.data.size} entries`);

  let { version: gameVersion, hotfix: gameVersionHotfix } = await game.loadVersion(config);
  console.log(`crosscode ${gameVersion}-${gameVersionHotfix}`);

  let runtimeModBaseDirectory = `${CCLOADER_DIR}runtime`;
  let runtimeMod: Mod | null;
  try {
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
  console.log(`${runtimeMod.id} ${runtimeMod.version}`);

  let installedMods = new Map<ModID, Mod>();
  installedMods.set(runtimeMod.id, runtimeMod);
  for (let dir of config.modsDirs) {
    // find and extract all ccmod files in
    await extractAllModArchives(dir);

    let count = await loadAllModMetadataInDir(dir, installedMods);
    console.log(`found ${count} mods in '${dir}'`);
  }
  installedMods = dependencyResolver.sortModsInLoadOrder(runtimeMod, installedMods);

  let loadedMods = new Map<ModID, Mod>();
  let loadedModsSetupPromises: Array<Promise<void>> = [];

  let virtualPackages = new Map<ModID, semver.SemVer>()
    .set('crosscode', gameVersion)
    .set(modloaderMetadata.name, modloaderMetadata.version);
  if (typeof process !== 'undefined') {
    virtualPackages.set('nw', new semver.SemVer(process.versions.nw));
  }

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
        console.warn(`Problem with requirements of mod '${modID}': ${problem}`);
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

  if (!loadedMods.has(runtimeMod.id)) {
    throw new Error('Could not load the runtime mod, game initialization is impossible!');
  }

  await Promise.all(loadedModsSetupPromises);

  console.log(
    `${loadedMods.size} mods will be loaded: ${Array.from(loadedMods.values())
      .map((mod) => {
        let str = mod.id;
        if (mod.version != null) str += ` v${mod.version}`;
        return str;
      })
      .join(', ')}`,
  );

  window.modloader = {
    name: modloaderMetadata.name,
    version: modloaderMetadata.version,
    gameVersion,
    gameVersionHotfix,
    installedMods,
    loadedMods,
    modDataStorage: modDataStorage.namespace,
    Mod: {},
    _runtimeMod: runtimeMod,
  };

  console.log('beginning the game boot sequence...');
  await game.buildNecessaryDOM(config);

  await initModPluginClasses(loadedMods);
  console.log('mod plugin classes created!');

  console.log("stage 'preload' reached!");
  await executeStage(loadedMods, 'preload');

  console.log('running the main game script...');
  let domReadyCallback = await game.loadMainScript(
    config,
    runtimeMod.pluginClassInstance as import('../runtime/src/_main').default,
  );

  console.log("stage 'postload' reached!");
  await executeStage(loadedMods, 'postload');
  domReadyCallback();

  let startGameFn = await game.getStartFunction();
  console.log("stage 'prestart' reached!");
  await executeStage(loadedMods, 'prestart');

  console.log('running startCrossCode()...');
  startGameFn();

  let activeDelegateFn = await game.getDelegateActivationFunction();
  console.log("stage 'poststart' reached!");
  await executeStage(loadedMods, 'poststart');

  activeDelegateFn();
  console.log('crosscode with mods is now fully loaded!');
}

async function loadModloaderMetadata(): Promise<{
  name: string;
  version: semver.SemVer;
}> {
  let toolJsonText = await files.loadText(`${CCLOADER_DIR}tool.config.json`);
  let data = JSON.parse(toolJsonText) as { name: string; version: string };
  return { name: data.name, version: new semver.SemVer(data.version) };
}

async function loadAllModMetadataInDir(modsDir: string, installedMods: ModsMap): Promise<number> {
  let count = 0;
  await Promise.all(
    (
      await files.getModDirectoriesIn(modsDir)
    ).map(async (fullPath) => {
      try {
        let mod = await loadModMetadata(fullPath);
        if (mod == null) return;

        let modWithSameId = installedMods.get(mod.id);
        if (modWithSameId != null) {
          throw new Error(
            `A mod with ID '${mod.id}' has already been loaded from '${modWithSameId.baseDirectory}'`,
          );
        }

        installedMods.set(mod.id, mod);
        count++;
      } catch (err) {
        console.error(
          `An error occured while loading the metadata of a mod in '${fullPath}':`,
          err,
        );
      }
    }),
  );
  return count;
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

  return new Mod(baseDirectory, manifestData, legacyMode);
}

async function initModPluginClasses(mods: ReadonlyModsMap): Promise<void> {
  for (let mod of mods.values()) {
    try {
      await mod.initClass();
    } catch (err) {
      console.error(`Failed to initialize class of mod '${mod.id}':`, err);
    }
  }
}

async function executeStage(mods: ReadonlyModsMap, stage: LoadingStage): Promise<void> {
  for (let mod of mods.values()) {
    try {
      await mod.executeStage(stage);
    } catch (err) {
      console.error(`Failed to execute ${stage} of mod '${mod.id}':`, err);
    }
  }
}

async function extractAllModArchives(dir: string): Promise<void> {
  const modArchives = await files.getModArchivesIn(dir);
  for (const modArchive of modArchives) {
    const archivePath = `${dir}${modArchive}.ccmod`;
    console.info(`Found "${archivePath}".`);
    // generate unique file path
    let targetPath = `${dir}${modArchive}/`;
    for (let i = 0; await files.exists(targetPath); i++) {
      targetPath = `${dir}${modArchive}${i}/`;
    }
    await files.mkdir(targetPath);
    // extract it there
    console.info(`Extracting mod archive to "${targetPath}".`);
    await zip.extract(archivePath, targetPath);
    // delete it after successful extraction
    await files.deleteFile(archivePath);
  }
}
