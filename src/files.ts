import { promises as fs } from './node-module-imports/_fs.js';
import { join as joinPaths } from './node-module-imports/_path.js';
import { errorHasCode } from '../common/dist/utils.js';

export function loadTextFile(url: string): Promise<string> {
  return fs.readFile(url, 'utf8');
}

export async function findFilesRecursively(dir: string): Promise<string[]> {
  let fileList: string[] = [];
  await findFilesRecursivelyInternal(dir, '', fileList);
  return fileList;
}

async function findFilesRecursivelyInternal(
  currentDir: string,
  relativeDir: string,
  fileList: string[],
): Promise<void> {
  let contents: string[];
  try {
    contents = await fs.readdir(currentDir);
  } catch (err) {
    if (errorHasCode(err) && err.code === 'ENOENT') return;
    throw err;
  }

  await Promise.all(
    contents.map(async name => {
      let fullPath = joinPaths(currentDir, name);
      let stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await findFilesRecursivelyInternal(
          fullPath,
          `${relativeDir}${name}/`,
          fileList,
        );
      } else {
        fileList.push(`${relativeDir}${name}`);
      }
    }),
  );
}
