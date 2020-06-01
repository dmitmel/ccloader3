import * as files from './files.js';
import {
  Manifest,
  ManifestInternal,
  ManifestLegacy,
  ManifestUtil,
  ModId,
} from './manifest.js';
import { Mod } from './mod.js';
import { promises as fs } from './node-module-imports/_fs.js';
import { SemVer } from './node-module-imports/_semver.js';
import { compare } from './utils.js';

export const name = 'ccloader';
export const version: SemVer = new SemVer('3.0.0-alpha');

export let gameVersion: SemVer | null = null;

let manifestUtil = new ManifestUtil();

export async function boot(): Promise<void> {
  console.log(`${name} v${version}`);
  gameVersion = await loadGameVersion();
  console.log(`crosscode v${gameVersion}`);

  let allMods = await loadAllModMetadata('assets/mods');
  console.log(allMods);
  console.log(sortModsInLoadOrder(allMods));
}

async function loadGameVersion(): Promise<SemVer> {
  let changelogText = await files.loadText('assets/data/changelog.json');
  let { changelog } = JSON.parse(changelogText) as {
    changelog: Array<{ version: string }>;
  };
  let latestVersion = changelog[0].version;
  return new SemVer(latestVersion);
}

async function loadAllModMetadata(modsDir: string): Promise<Map<ModId, Mod>> {
  let mods = new Map<ModId, Mod>();

  await Promise.all(
    (await fs.readdir(modsDir)).map(async name => {
      let fullPath = `${modsDir}/${name}`;
      try {
        // the `withFileTypes` option of `readdir` can't be used here because it
        // doesn't dereference symbolic links similarly to `stat`
        let stat = await fs.stat(fullPath);
        if (!stat.isDirectory()) return;
        let mod = await loadModMetadata(fullPath);
        if (mod == null) return;

        let { id } = mod.manifest;
        let modWithSameId = mods.get(id);
        if (modWithSameId != null) {
          throw new Error(
            `a mod with ID '${id}' has already been loaded from '${modWithSameId.baseDirectory}'`,
          );
        } else {
          mods.set(id, mod);
        }
      } catch (err) {
        console.error(
          `An error occured while loading the metadata of a mod in '${fullPath}':`,
          err,
        );
      }
    }),
  );

  return mods;
}

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
      console.warn(_e1);
      console.warn(_e2);
      return null;
    }
  }

  let rawManifestData: unknown;
  try {
    rawManifestData = JSON.parse(manifestText) as unknown;
  } catch (err) {
    if (err instanceof Error) {
      err.message = `Syntax error in mod manifest in '${manifestFile}': ${err.message}`;
    }
    throw err;
  }

  let manifest: ManifestInternal;

  try {
    if (legacyMode) {
      manifestUtil.validateLegacy(rawManifestData as ManifestLegacy);
      manifest = manifestUtil.convertFromLegacy(
        rawManifestData as ManifestLegacy,
      );
    } else {
      manifestUtil.validate(rawManifestData as Manifest);
      manifest = manifestUtil.convertToInternal(rawManifestData as Manifest);
    }
  } catch (err) {
    if (err instanceof Error) {
      err.message = `Invalid mod manifest in '${manifestFile}': ${err.message}`;
      // TODO: put a link to the documentation here
    }
    throw err;
  }

  return new Mod(baseDirectory, manifest, legacyMode);
}

// note that maps preserve insertion order as defined in the ECMAScript spec
function sortModsInLoadOrder(allModsMap: Map<ModId, Mod>): Map<ModId, Mod> {
  let orderedModsMap = new Map<ModId, Mod>();

  let unorderedMods: Mod[] = Array.from(
    allModsMap.values(),
  ).sort((mod1, mod2) => compare(mod1.manifest.id, mod2.manifest.id));

  while (unorderedMods.length > 0) {
    // dependency cycles can be detected by checking if we removed any
    // dependencies in this iteration, although see the comment below
    let dependencyCyclesExist = true;

    for (let i = 0; i < unorderedMods.length; ) {
      let mod = unorderedMods[i];
      if (!hasUnmetDependencies(mod, orderedModsMap, allModsMap)) {
        unorderedMods.splice(i, 1);
        orderedModsMap.set(mod.manifest.id, mod);
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

  return orderedModsMap;
}

function hasUnmetDependencies(
  mod: Mod,
  orderedModsMap: Map<ModId, Mod>,
  _allModsMap: Map<ModId, Mod>, // unused right now, but won't be when optional deps are implemented
): boolean {
  return (
    Object.keys(mod.dependencies).findIndex(
      depId =>
        !orderedModsMap.has(depId) &&
        depId !== 'crosscode' &&
        depId !== 'ccloader',
    ) >= 0
  );
}
