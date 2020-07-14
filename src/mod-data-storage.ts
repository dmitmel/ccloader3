// Inspired by:
// https://github.com/dmitmel/crosscode-readable-saves/blob/ed25ab8b061f0a75acf54bc2485fead47523fc2e/src/postload.ts#L78-L284
// https://github.com/CCDirectLink/ccbot-backup/blob/ddc5475081fc2367feba929da9270a88abfc1bc9/src/dynamic-data.ts#L19-L143

// If an rwlock-based implementation is ever desired, see:
// https://github.com/Wizcorp/locks/blob/master/lib/ReadWriteLock.js
// https://github.com/71104/rwlock/blob/master/src/lock.js

import { errorHasCode, mapGetOrInsert } from '../common/dist/utils.js';

const { promises: fs } = (typeof require === 'function'
  ? require('fs')
  : {}) as typeof import('fs');
const pathsNative = (typeof require === 'function' ? require('path') : {}) as typeof import('path');

type ModID = modloader.ModID;
type ModEntry = modloader.modDataStorage.FileDataV1.ModEntry;

const FILENAME = 'cc-mod-settings.json';

class ModSettingsStorageFile {
  private path: string;
  public serializeIndentation: string | number | undefined | null = null;
  public data: Map<ModID, ModEntry> = null!;
  private queuedWritesPromise: Promise<void> | null = null;
  private queuedWritesFlag = false;

  public constructor() {
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

    this.path = pathsNative.join(saveDirPath, FILENAME);
  }

  public async readImmediately(): Promise<void> {
    let rawData: Buffer;
    try {
      rawData = await fs.readFile(this.path);
    } catch (err) {
      if (errorHasCode(err) && err.code === 'ENOENT') {
        this.data = new Map();
        return;
      } else {
        throw err;
      }
    }
    this.deserialize(rawData);
  }

  public async writeImmediately(): Promise<void> {
    let rawData: Buffer = this.serialize();
    await fs.writeFile(this.path, rawData);
  }

  public async write(): Promise<void> {
    if (this.queuedWritesPromise == null) {
      let queuedWritesResolve: () => void = null!;
      this.queuedWritesPromise = new Promise((resolve) => {
        queuedWritesResolve = resolve;
      });

      do {
        this.queuedWritesFlag = false;
        try {
          await this.writeImmediately();
        } catch (err) {
          console.error('Error while writing mod data and settings:', err);
          // TODO: can, and, more importantly, should, the error be thrown out
          // of this function?
        }
      } while (this.queuedWritesFlag);

      this.queuedWritesPromise = null;
      queuedWritesResolve();
    } else {
      this.queuedWritesFlag = true;
      await this.queuedWritesPromise;
    }
  }

  private serialize(): Buffer {
    let jsonData: modloader.modDataStorage.FileData = { version: 1, data: {} };
    for (let [modID, modEntry] of this.data) {
      jsonData.data[modID] = modEntry;
    }

    return Buffer.from(
      JSON.stringify(
        jsonData,
        null,
        // definition of `JSON.stringify` accepts only `undefined` and not `null`
        // here, so I abuse the `??` operator here to turn nullable values of
        // type `X | null | undefined` into `X | undefined`
        // eslint-disable-next-line no-undefined
        this.serializeIndentation ?? undefined,
      ),
      'utf8',
    );
  }

  private deserialize(rawData: Buffer): void {
    let jsonData = JSON.parse(rawData.toString('utf8')) as modloader.modDataStorage.FileData;
    if (jsonData.version !== 1) {
      throw new Error(`Unsupported format version '${jsonData.version}'`);
    }

    this.data = new Map();
    for (let [modID, modEntry] of Object.entries(jsonData.data)) {
      this.data.set(modID, modEntry);
    }
  }

  public isModEnabled(id: ModID): boolean {
    return localStorage.getItem(`modEnabled-${id}`) !== 'false';
  }

  public setModEnabled(id: ModID, enabled: boolean): void {
    let modEntry = mapGetOrInsert(this.data, id, { enabled });
    modEntry.enabled = enabled;
    localStorage.setItem(`modEnabled-${id}`, String(enabled));
  }
}

export default new ModSettingsStorageFile();
