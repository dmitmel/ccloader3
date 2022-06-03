import * as filesBrowser from './files.browser.js';
import { Config } from './config.js';

export { isReadable, loadText } from './files.browser.js';

export async function getModDirectoriesIn(dir: string, config: Config): Promise<string[]> {
  if (dir === `${config.gameAssetsDir}mods/`) {
    let result: unknown = window.CrossAndroidModListProvider?.getModListAsJson?.();
    if (typeof result === 'string') {
      let rawList = JSON.parse(result) as string[];
      let modDirs: string[] = [];
      for (let modDirName of rawList) {
        if (modDirName.endsWith('/')) {
          modDirs.push(`${dir}/${modDirName.slice(0, -1)}`);
        }
      }
      return modDirs;
    }
  }
  return filesBrowser.getModDirectoriesIn(dir, config);
}

export async function getInstalledExtensions(config: Config): Promise<string[]> {
  let result: unknown = window.CrossAndroidExtensionListProvider?.getExtensionListAsJson?.();
  if (typeof result === 'string') {
    return JSON.parse(result) as string[];
  }
  return filesBrowser.getInstalledExtensions(config);
}
