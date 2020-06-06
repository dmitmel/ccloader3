import { errorHasMessage } from '../common/dist/utils.js';
import * as paths from '../common/dist/paths.js';

export async function loadFile(url: string): Promise<string> {
  try {
    let res = await fetch(`/${url}`);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } catch (err) {
    if (errorHasMessage(err)) {
      err.message = `Failed to load file '${url}': ${err.message}`;
    }
    throw err;
  }
}

export function findRecursively(_dir: string): Promise<string[]> {
  throw new Error('unsupported');
}

export async function getModDirectoriesIn(dir: string): Promise<string[]> {
  if (dir.endsWith('/')) dir = dir.slice(0, -1);

  let indexPath = `${dir}/index.json`;
  let indexJsonText = await loadFile(indexPath);
  let index: string[];

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    index = JSON.parse(indexJsonText);
  } catch (err) {
    if (errorHasMessage(err)) {
      err.message = `Syntax error in mods directory index in '${indexPath}': ${err.message}`;
    }
    throw err;
  }

  return index.map((modDirPath) => paths.join(dir, modDirPath));
}
