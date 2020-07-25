// Inspired by:
// https://github.com/dmitmel/crosscode-readable-saves/blob/ed25ab8b061f0a75acf54bc2485fead47523fc2e/src/postload.ts#L78-L284
// https://github.com/CCDirectLink/ccbot-backup/blob/ddc5475081fc2367feba929da9270a88abfc1bc9/src/dynamic-data.ts#L19-L143

// If an rwlock-based implementation is ever desired, see:
// https://github.com/Wizcorp/locks/blob/master/lib/ReadWriteLock.js
// https://github.com/71104/rwlock/blob/master/src/lock.js

import { errorHasCode, mapGetOrInsert } from '../common/dist/utils.js';
import { FileData } from 'ultimate-crosscode-typedefs/file-types/mod-data-storage';
import { ModEntry } from 'ultimate-crosscode-typedefs/file-types/mod-data-storage/v1';
import { ModID } from 'ultimate-crosscode-typedefs/modloader/mod';

const { promises: fs } = (typeof require === 'function'
  ? require('fs')
  : {}) as typeof import('fs');
const pathsNative = (typeof require === 'function' ? require('path') : {}) as typeof import('path');

const FILE_PATH: string = (function getFilePath() {
  // taken from https://github.com/dmitmel/crosscode-readable-saves/blob/ed25ab8b061f0a75acf54bc2485fead47523fc2e/src/postload.ts#L289-L298
  let saveDirPath = nw.App.dataPath;

  // On Windows `nw.App.dataPath` is `%LOCALAPPDATA%\CrossCode\User Data\Default`,
  // yet the game writes the savegame to `%LOCALAPPDATA%\CrossCode` when
  // possible, so I reproduce this behavior. Notice that this implementation
  // IS BROKEN when `%LOCALAPPDATA%` contains the `\User Data\Default`
  // substring, but eh, whatever, this is the exact piece of code the stock
  // game uses.
  let userDataIndex = saveDirPath.indexOf('\\User Data\\Default');
  if (userDataIndex >= 0) saveDirPath = saveDirPath.slice(0, userDataIndex);

  return pathsNative.join(saveDirPath, 'cc-mod-settings.json');
})();

export const data = new Map<ModID, ModEntry>();

let queuedWritesPromise: Promise<void> | null = null;
let queuedWritesFlag = false;

export async function readImmediately(): Promise<void> {
  data.clear();

  let rawData: Buffer;
  try {
    rawData = await fs.readFile(FILE_PATH);
  } catch (err) {
    if (errorHasCode(err) && err.code === 'ENOENT') return;
    throw err;
  }
  deserialize(rawData);
}

export async function writeImmediately(): Promise<void> {
  let rawData: Buffer = serialize();
  await fs.writeFile(FILE_PATH, rawData);
}

export async function write(): Promise<void> {
  if (queuedWritesPromise == null) {
    let queuedWritesResolve: () => void = null!;
    queuedWritesPromise = new Promise((resolve) => {
      queuedWritesResolve = resolve;
    });

    do {
      queuedWritesFlag = false;
      try {
        await writeImmediately();
      } catch (err) {
        console.error('Error while writing mod data and settings:', err);
        // TODO: can, and, more importantly, should, the error be thrown out of
        // this function?
      }
    } while (queuedWritesFlag);

    queuedWritesPromise = null;
    queuedWritesResolve();
  } else {
    queuedWritesFlag = true;
    await queuedWritesPromise;
  }
}

function deserialize(rawData: Buffer): void {
  let jsonData = JSON.parse(rawData.toString('utf8')) as FileData;
  if (jsonData.version !== 1) {
    throw new Error(`Unsupported format version '${jsonData.version}'`);
  }

  for (let [modID, modEntry] of Object.entries(jsonData.data)) {
    data.set(modID, modEntry);
  }
}

function serialize(): Buffer {
  let jsonData: FileData = { version: 1, data: {} };
  for (let [modID, modEntry] of data) {
    jsonData.data[modID] = modEntry;
  }

  return Buffer.from(JSON.stringify(jsonData), 'utf8');
}

export function isModEnabled(id: ModID): boolean {
  return data.get(id)?.enabled ?? true;
}

export function setModEnabled(id: ModID, enabled: boolean): void {
  mapGetOrInsert(data, id, { enabled }).enabled = enabled;
}
