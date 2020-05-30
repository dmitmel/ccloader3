import * as files from './files.js';
import {
  Manifest,
  ManifestInternal,
  ManifestLegacy,
  ManifestUtil,
} from './manifest.js';
import { Mod } from './mod.js';
import { promises as fs } from './node-module-imports/_fs.js';
import { SemVer } from './node-module-imports/_semver.js';

export const name = 'ccloader';
export const version: SemVer = new SemVer('3.0.0-alpha');

export let gameVersion: SemVer | null = null;

let manifestUtil = new ManifestUtil();

export async function boot(): Promise<void> {
  console.log(`${name} v${version}`);
  gameVersion = await loadGameVersion();
  console.log(`crosscode v${gameVersion}`);
  console.log(await loadAllModMetadata('assets/mods'));
}

async function loadGameVersion(): Promise<SemVer> {
  let changelogText = await files.loadText('assets/data/changelog.json');
  let { changelog } = JSON.parse(changelogText) as {
    changelog: Array<{ version: string }>;
  };
  let latestVersion = changelog[0].version;
  return new SemVer(latestVersion);
}

async function loadAllModMetadata(modsDir: string): Promise<Mod[]> {
  let mods: Mod[] = [];

  await Promise.all(
    (await fs.readdir(modsDir)).map(async name => {
      // the `withFileTypes` option of `readdir` can't be used here because it
      // doesn't dereference symbolic links similarly to `stat`
      let fullPath = `${modsDir}/${name}`;
      let stat = await fs.stat(fullPath);
      if (!stat.isDirectory()) return;
      let mod = await loadModMetadata(fullPath);
      if (mod == null) return;
      mods.push(mod);
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
      manifestUtil.validate(rawManifestData as Manifest, legacyMode);
      manifest = manifestUtil.convertToInternal(rawManifestData as Manifest);
    }
  } catch (err) {
    if (err instanceof Error) {
      err.message = `Invalid mod manifest in '${manifestFile}': ${err.message}`;
    }
    throw err;
  }

  return new Mod(baseDirectory, manifest, legacyMode);
}
