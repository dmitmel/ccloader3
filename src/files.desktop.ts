import * as utils from '../common/dist/utils.js';

const fs = (window.require?.('fs') as typeof import('fs'))?.promises;

export async function loadText(path: string): Promise<string> {
  return fs.readFile(path, 'utf8');
}

export async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
  } catch (err) {
    if (utils.errorHasCode(err) && err.code === 'ENOENT') return false;
    throw err;
  }
  return true;
}

export async function findRecursively(dir: string): Promise<string[]> {
  if (dir.endsWith('/')) dir = dir.slice(0, -1);

  let fileList: string[] = [];
  await findRecursivelyInternal(dir, '', fileList);
  return fileList;
}

async function findRecursivelyInternal(
  currentDir: string,
  relativePrefix: string,
  fileList: string[],
): Promise<void> {
  let contents: string[];
  try {
    contents = await fs.readdir(currentDir);
  } catch (err) {
    if (utils.errorHasCode(err) && err.code === 'ENOENT') return;
    throw err;
  }

  await Promise.all(
    contents.map(async (name) => {
      let fullPath = `${currentDir}/${name}`;
      let stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await findRecursivelyInternal(fullPath, `${relativePrefix}${name}/`, fileList);
      } else {
        fileList.push(`${relativePrefix}${name}`);
      }
    }),
  );
}

export async function getModDirectoriesIn(dir: string): Promise<string[]> {
  if (dir.endsWith('/')) dir = dir.slice(0, -1);

  let allContents: string[];

  try {
    allContents = await fs.readdir(dir);
  } catch (err) {
    if (utils.errorHasCode(err) && err.code === 'ENOENT') {
      console.warn(`Directory '${dir}' not found, did you forget to create it?`);
      return [];
    } else {
      throw err;
    }
  }

  let modDirectories: string[] = [];

  await Promise.all(
    allContents.map(async (name) => {
      let fullPath = `${dir}/${name}`;
      // the `withFileTypes` option of `readdir` can't be used here because it
      // doesn't dereference symbolic links similarly to `stat`
      let stat = await fs.stat(fullPath);
      if (stat.isDirectory()) modDirectories.push(fullPath);
    }),
  );

  return modDirectories;
}
