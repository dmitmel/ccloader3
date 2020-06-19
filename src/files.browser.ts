import { errorHasMessage } from '../common/dist/utils.js';
import * as paths from '../common/dist/paths.js';

export async function loadText(path: string): Promise<string> {
  try {
    let res = await fetch(`/${path}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } catch (err) {
    if (errorHasMessage(err)) {
      err.message = `Failed to load file '${path}': ${err.message}`;
    }
    throw err;
  }
}

export async function exists(path: string): Promise<boolean> {
  throw new Error('unsupported');
}

export function findRecursively(_dir: string): Promise<string[]> {
  throw new Error('unsupported');
}

export async function getModDirectoriesIn(dir: string): Promise<string[]> {
  if (dir.endsWith('/')) dir = dir.slice(0, -1);

  let indexPath = `${dir}/index.json`;
  let indexJsonText = await loadText(indexPath);
  let index: string[];

  try {
    index = JSON.parse(indexJsonText);
  } catch (err) {
    if (errorHasMessage(err)) {
      err.message = `Syntax error in mods directory index in '${indexPath}': ${err.message}`;
    }
    throw err;
  }

  return index.map((modDirPath) => paths.join(dir, modDirPath));
}
