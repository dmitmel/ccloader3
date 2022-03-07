import * as utils from '../common/dist/utils.js';
import * as paths from '../common/dist/paths.js';
import { Config } from './config.js';

export async function loadText(path: string): Promise<string> {
  try {
    let res = await fetch(utils.cwdFilePathToURL(path).href);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } catch (err) {
    if (utils.errorHasMessage(err)) {
      err.message = `Failed to load file '${path}': ${err.message}`;
    }
    throw err;
  }
}

export async function exists(path: string): Promise<boolean> {
  try {
    let res = await fetch(utils.cwdFilePathToURL(path).href, { method: 'HEAD' });
    if (res.status === 404) return false;
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return true;
  } catch (err) {
    if (utils.errorHasMessage(err)) {
      err.message = `HEAD request to '${path}' failed: ${err.message}`;
    }
    throw err;
  }
}

export async function getModDirectoriesIn(dir: string): Promise<string[]> {
  if (dir.endsWith('/')) dir = dir.slice(0, -1);

  let indexPath = `${dir}/index.json`;
  let indexJsonText = await loadText(indexPath);
  let index: string[];

  try {
    index = JSON.parse(indexJsonText);
  } catch (err) {
    if (utils.errorHasMessage(err)) {
      err.message = `Syntax error in mods directory index in '${indexPath}': ${err.message}`;
    }
    throw err;
  }

  return index.map((modDirPath) => paths.join(dir, modDirPath));
}

// Replicates the behavior of `ig.ExtensionList#loadExtensionsPHP`.
export async function getInstalledExtensions(config: Config): Promise<string[]> {
  let igRoot = config.impactConfig.IG_ROOT ?? '';
  let igDebug = Boolean(config.impactConfig.IG_GAME_DEBUG);
  let extensionsApiUrl = `${igRoot}page/api/get-extension-list.php?debug=${igDebug ? 1 : 0}`;
  try {
    let res = await fetch(extensionsApiUrl);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    // Should the response be validated?
    return JSON.parse(await res.text());
  } catch (err) {
    if (utils.errorHasMessage(err)) {
      err.message = `Failed to send request to '${extensionsApiUrl}': ${err.message}`;
    }
    throw err;
  }
}
