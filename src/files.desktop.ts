import * as utils from '../common/dist/utils.js';

const fs = (window.require?.('fs') as typeof import('fs'))?.promises;

export async function loadText(path: string): Promise<string> {
  return fs.readFile(path, 'utf8');
}

export async function loadBinary(path: string): Promise<Buffer | ArrayBuffer> {
  return fs.readFile(path);
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

async function getAllFilesInDirectory(dir: string): Promise<string[]> {
  let allFiles: string[] = [];
  try {
    allFiles = await fs.readdir(dir);
  } catch (err) {
    if (utils.errorHasCode(err) && err.code === 'ENOENT') {
      console.warn(`Directory '${dir}' not found, did you forget to create it?`);
    } else {
      throw err;
    }
  }
  return allFiles;
}

export async function getModArchivesIn(dir: string): Promise<string[]> {
  const files = await getAllFilesInDirectory(dir);
  const modArchives: string[] = [];
  await Promise.all(
    files.map(async (name) => {
      let fullPath = `${dir}/${name}`;

      let stat = await fs.stat(fullPath);
      const extension = '.ccmod';
      if (!stat.isDirectory() && name.endsWith(extension)) {
        modArchives.push(name.slice(0, -extension.length));
      }
    }),
  );
  return modArchives;
}

export async function getModDirectoriesIn(dir: string): Promise<string[]> {
  if (dir.endsWith('/')) dir = dir.slice(0, -1);

  let allContents: string[] = await getAllFilesInDirectory(dir);

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

export async function createFile(filePath: string, data: Uint8Array): Promise<void> {
  await fs.writeFile(filePath, data);
}

export async function deleteFile(filePath: string): Promise<void> {
  await fs.unlink(filePath);
}

export async function mkdir(dir: string): Promise<void> {
  await fs.mkdir(dir);
}
